from django.db.models import ProtectedError, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsEtablissementAdmin
from core.utils import log_activity

from .models import Abonnement, Classe, Etablissement, Filiere, Plan, ResponsableInvitationCode
from .serializers import (
    AbonnementSerializer,
    ClasseSerializer,
    EtablissementMembreSerializer,
    EtablissementSerializer,
    FiliereSerializer,
    ImportApprenantsSerializer,
    PlanSerializer,
    ResponsableInvitationCodeSerializer,
)
from .services import a_acces_premium, abonnement_actif_pour, ajouter_mois, parse_import_file, split_full_name


class EtablissementListCreateView(generics.ListCreateAPIView):
    """Gestion des établissements clients — réservé à l'admin plateforme."""

    queryset = Etablissement.objects.prefetch_related("abonnements__plan", "membres")
    serializer_class = EtablissementSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        etablissement = serializer.save()
        log_activity(self.request.user, "ETABLISSEMENT_CREATION", etablissement.nom)


class EtablissementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Etablissement.objects.prefetch_related("abonnements__plan", "membres")
    serializer_class = EtablissementSerializer
    permission_classes = [IsAdmin]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.membres.exists():
            return Response(
                {"detail": "Impossible de supprimer : des comptes sont rattachés à cet établissement. Désactivez-le plutôt."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_activity(request.user, "ETABLISSEMENT_SUPPRESSION", instance.nom)
        return super().destroy(request, *args, **kwargs)


class EtablissementCodeResponsableView(APIView):
    """GET/POST /api/etablissements/<uuid>/code-responsable/ — réservé à
    l'admin plateforme. GET renvoie le code courant (ou 204 si aucun n'a
    encore été généré). POST (re)génère toujours un code neuf : l'ancien
    est immédiatement invalidé (OneToOne, remplacé plutôt qu'accumulé) —
    utile si le premier code a été perdu avant d'être rédemé."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        etablissement = get_object_or_404(Etablissement, pk=pk)
        code = getattr(etablissement, "code_responsable", None)
        if code is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(ResponsableInvitationCodeSerializer(code).data)

    def post(self, request, pk):
        etablissement = get_object_or_404(Etablissement, pk=pk)
        ResponsableInvitationCode.objects.filter(etablissement=etablissement).delete()
        code = ResponsableInvitationCode.objects.create(etablissement=etablissement)
        log_activity(request.user, "CODE_RESPONSABLE_GENERATION", etablissement.nom)
        return Response(ResponsableInvitationCodeSerializer(code).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Espace "Établissement" : le responsable côté client (ETABLISSEMENT_ADMIN)
# gère SES formateurs/apprenants, jamais ceux d'un autre établissement — le
# scoping se fait systématiquement sur request.user.etablissement, jamais
# sur un paramètre d'URL (qui permettrait de trafiquer l'id consulté).
# ---------------------------------------------------------------------------


class EtablissementMoiView(APIView):
    """GET /api/etablissement/moi/ — fiche du propre établissement du
    responsable connecté (nom, code d'invitation, statut d'abonnement)."""

    permission_classes = [IsEtablissementAdmin]

    def get(self, request):
        return Response(EtablissementSerializer(request.user.etablissement).data)


class EtablissementMembresView(generics.ListAPIView):
    """GET /api/etablissement/membres/?role=STUDENT|INSTRUCTOR — formateurs
    et apprenants du même établissement que le responsable connecté."""

    serializer_class = EtablissementMembreSerializer
    permission_classes = [IsEtablissementAdmin]

    def get_queryset(self):
        queryset = (
            User.objects.filter(etablissement=self.request.user.etablissement)
            .select_related("classe")
            .order_by("first_name", "last_name")
        )
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        classe_id = self.request.query_params.get("classe")
        if classe_id:
            queryset = queryset.filter(classe_id=classe_id)
        return queryset


class EtablissementMembreDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/etablissement/membres/<uuid>/ — le queryset restreint
    à son établissement fait qu'un id d'un autre établissement renvoie 404,
    jamais les données d'un tiers. Seul `is_active` est modifiable
    (serializer déjà restrictif, mais on le documente ici aussi)."""

    serializer_class = EtablissementMembreSerializer
    permission_classes = [IsEtablissementAdmin]

    def get_queryset(self):
        return User.objects.filter(etablissement=self.request.user.etablissement)

    def perform_update(self, serializer):
        member = serializer.save()
        etat = "activé" if member.is_active else "désactivé"
        classe = f", classe={member.classe.nom}" if member.classe_id else ""
        log_activity(self.request.user, "ETABLISSEMENT_MEMBRE_MAJ", f"{member.email} {etat}{classe}")


# ---------------------------------------------------------------------------
# Filières & classes propres à un établissement — scoping systématique sur
# request.user.etablissement, jamais sur un paramètre d'URL.
# ---------------------------------------------------------------------------


class FiliereListCreateView(generics.ListCreateAPIView):
    serializer_class = FiliereSerializer
    permission_classes = [IsEtablissementAdmin]

    def get_queryset(self):
        return Filiere.objects.filter(etablissement=self.request.user.etablissement)

    def perform_create(self, serializer):
        filiere = serializer.save(etablissement=self.request.user.etablissement)
        log_activity(self.request.user, "FILIERE_CREATION", filiere.nom)


class FiliereDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FiliereSerializer
    permission_classes = [IsEtablissementAdmin]

    def get_queryset(self):
        return Filiere.objects.filter(etablissement=self.request.user.etablissement)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.classes.exists():
            return Response(
                {"detail": "Impossible de supprimer : des classes appartiennent à cette filière."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_activity(request.user, "FILIERE_SUPPRESSION", instance.nom)
        return super().destroy(request, *args, **kwargs)


class ClasseListCreateView(generics.ListCreateAPIView):
    serializer_class = ClasseSerializer
    permission_classes = [IsEtablissementAdmin]

    def get_queryset(self):
        return Classe.objects.filter(etablissement=self.request.user.etablissement).select_related("filiere")

    def perform_create(self, serializer):
        classe = serializer.save(etablissement=self.request.user.etablissement)
        log_activity(self.request.user, "CLASSE_CREATION", classe.nom)


class ClasseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClasseSerializer
    permission_classes = [IsEtablissementAdmin]

    def get_queryset(self):
        return Classe.objects.filter(etablissement=self.request.user.etablissement).select_related("filiere")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.eleves.exists():
            return Response(
                {"detail": "Impossible de supprimer : des élèves sont rattachés à cette classe. Réaffectez-les d'abord."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_activity(request.user, "CLASSE_SUPPRESSION", instance.nom)
        return super().destroy(request, *args, **kwargs)


class EtablissementImportApprenantsView(APIView):
    """POST /api/etablissement/apprenants/importer/ — création en masse à
    partir d'un fichier .csv/.xlsx (nom + email Google), directement
    rattachée à une classe. Aucun mot de passe n'est créé : ces comptes se
    connectent uniquement via "Continuer avec Google" (même email) — le
    login Google existant les reconnaît par email et les rattache
    automatiquement (cf. accounts.views.GoogleAuthView), sans code de
    vérification puisque le compte existe déjà.

    Rapport honnête en retour : jamais de faux "tout s'est bien passé" —
    chaque ligne ignorée est justifiée (email invalide, compte déjà pris
    ailleurs, quota de places atteint)."""

    permission_classes = [IsEtablissementAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ImportApprenantsSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        classe = serializer.validated_data["classe"]
        uploaded_file = serializer.validated_data["file"]

        try:
            lignes = parse_import_file(uploaded_file)
        except Exception:
            return Response(
                {"detail": "Impossible de lire ce fichier — vérifiez son format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not lignes:
            return Response(
                {"detail": "Aucune ligne exploitable trouvée dans le fichier."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        etablissement = request.user.etablissement
        abonnement = next((a for a in etablissement.abonnements.all() if a.est_actif), None)
        places_restantes = None
        if abonnement and abonnement.plan.max_membres is not None:
            places_restantes = abonnement.plan.max_membres - etablissement.membres.count()

        created, updated, skipped = [], [], []

        for nom, email in lignes:
            if not email or "@" not in email:
                skipped.append({"nom": nom, "email": email, "raison": "Email invalide ou manquant."})
                continue

            existant = User.objects.filter(email__iexact=email).first()
            if existant:
                if existant.etablissement_id == etablissement.id:
                    existant.classe = classe
                    existant.save(update_fields=["classe"])
                    updated.append({"nom": nom, "email": email})
                else:
                    skipped.append({"nom": nom, "email": email, "raison": "Un compte existe déjà avec cet email."})
                continue

            if places_restantes is not None and places_restantes <= 0:
                skipped.append({"nom": nom, "email": email, "raison": "Quota de places du forfait atteint."})
                continue

            prenom, nom_famille = split_full_name(nom)
            User.objects.create_user(
                email=email,
                password=None,
                first_name=prenom,
                last_name=nom_famille,
                role=User.Role.STUDENT,
                etablissement=etablissement,
                classe=classe,
            )
            created.append({"nom": nom, "email": email})
            if places_restantes is not None:
                places_restantes -= 1

        log_activity(
            request.user,
            "IMPORT_APPRENANTS",
            f"{classe.nom} — {len(created)} créés, {len(updated)} mis à jour, {len(skipped)} ignorés",
        )
        return Response({"created": created, "updated": updated, "skipped": skipped})


class PlanListCreateView(generics.ListCreateAPIView):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAdmin]


class PlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAdmin]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Impossible de supprimer : des abonnements utilisent ce plan. Désactivez-le plutôt."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AbonnementListCreateView(generics.ListCreateAPIView):
    """Activation manuelle d'un abonnement par l'admin (un établissement a
    payé par virement, un particulier en espèces...). Le paiement en ligne
    automatisé viendra créer les abonnements par ce même modèle."""

    queryset = Abonnement.objects.select_related("user", "etablissement", "plan")
    serializer_class = AbonnementSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        abonnement = serializer.save()
        log_activity(self.request.user, "ABONNEMENT_ACTIVATION", str(abonnement))


class AbonnementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Abonnement.objects.select_related("user", "etablissement", "plan")
    serializer_class = AbonnementSerializer
    permission_classes = [IsAdmin]


class AbonnementAnnulerView(APIView):
    """POST /api/abonnements/<uuid>/annuler/ — coupe les droits immédiatement."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            abonnement = Abonnement.objects.get(pk=pk)
        except Abonnement.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if abonnement.statut == Abonnement.Statut.ANNULE:
            return Response({"detail": "Cet abonnement est déjà annulé."}, status=status.HTTP_400_BAD_REQUEST)
        abonnement.statut = Abonnement.Statut.ANNULE
        abonnement.save()
        log_activity(request.user, "ABONNEMENT_ANNULATION", str(abonnement))
        return Response(AbonnementSerializer(abonnement).data)


class ApprenantsAbonnementView(generics.GenericAPIView):
    """GET /api/abonnements/apprenants/ — un compte par ligne (tous les
    Apprenants), avec son statut Gratuit/Premium. Remplace la gestion des
    formules côté admin : l'admin voit directement les comptes, pas des
    lignes d'abonnement abstraites.

    Hérite de GenericAPIView (pas juste APIView) pour bénéficier de la
    pagination DRF standard (self.paginate_queryset) même si la réponse
    est construite ligne par ligne plutôt que sérialisée depuis un
    queryset direct — sans ça, cette vue renvoyait TOUS les apprenants
    d'un coup, sans jamais s'arrêter à une page."""

    permission_classes = [IsAdmin]

    def get_queryset(self):
        apprenants = (
            User.objects.filter(role=User.Role.STUDENT)
            .select_related("etablissement")
            .order_by("first_name", "last_name")
        )

        # "Premium" est calculé (abonnement personnel OU établissement actif),
        # jamais un champ direct sur User — on calcule donc une bonne fois les
        # ids concernés, puis on filtre dessus, plutôt que de dupliquer une
        # logique de statut différente de celle du reste de l'app (le
        # « videur » de billing.services).
        statut = self.request.query_params.get("statut")
        if statut in ("PREMIUM", "FREE"):
            aujourd_hui = timezone.now().date()
            actifs = Abonnement.objects.filter(statut=Abonnement.Statut.ACTIF, date_fin__gte=aujourd_hui)
            users_premium = actifs.filter(user__isnull=False).values_list("user_id", flat=True)
            etabs_premium = actifs.filter(etablissement__isnull=False).values_list("etablissement_id", flat=True)
            premium_filter = Q(id__in=users_premium) | Q(etablissement_id__in=etabs_premium)
            apprenants = apprenants.filter(premium_filter) if statut == "PREMIUM" else apprenants.exclude(premium_filter)

        q = self.request.query_params.get("q")
        if q:
            apprenants = apprenants.filter(Q(email__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))

        return apprenants

    def get(self, request):
        apprenants = self.get_queryset()
        page = self.paginate_queryset(apprenants)
        cible = page if page is not None else apprenants

        aujourd_hui = timezone.now().date()

        abonnements_perso = {
            abonnement.user_id: abonnement
            for abonnement in Abonnement.objects.filter(
                user__in=cible, statut=Abonnement.Statut.ACTIF, date_fin__gte=aujourd_hui
            ).select_related("plan")
        }
        etablissement_ids = [a.etablissement_id for a in cible if a.etablissement_id]
        abonnements_etab = {
            abonnement.etablissement_id: abonnement
            for abonnement in Abonnement.objects.filter(
                etablissement_id__in=etablissement_ids,
                statut=Abonnement.Statut.ACTIF,
                date_fin__gte=aujourd_hui,
            ).select_related("plan")
        }

        resultats = []
        for apprenant in cible:
            perso = abonnements_perso.get(apprenant.id)
            etab = abonnements_etab.get(apprenant.etablissement_id) if apprenant.etablissement_id else None
            actif_via = perso or etab

            resultats.append(
                {
                    "id": apprenant.id,
                    "email": apprenant.email,
                    "first_name": apprenant.first_name,
                    "last_name": apprenant.last_name,
                    "etablissement_nom": apprenant.etablissement.nom if apprenant.etablissement_id else None,
                    "actif": bool(actif_via),
                    "via": ("personnel" if perso else "etablissement") if actif_via else None,
                    "plan_nom": actif_via.plan.nom if actif_via else None,
                    "date_fin": actif_via.date_fin if actif_via else None,
                    # Seul un abonnement personnel se gère (annule) depuis cette
                    # vue : un abonnement via établissement se gère sur sa fiche.
                    "abonnement_id": perso.id if perso else None,
                }
            )

        if page is not None:
            return self.get_paginated_response(resultats)
        return Response(resultats)


class ActiverPremiumView(APIView):
    """POST /api/abonnements/apprenants/<uuid>/activer/ — active le Premium
    d'un apprenant en un clic, une fois le paiement confirmé hors-ligne par
    l'admin. Utilise la formule individuelle active (durée définie sur le
    Plan), sans que l'admin ait à choisir/gérer de formule lui-même."""

    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        apprenant = get_object_or_404(User, pk=user_id, role=User.Role.STUDENT)

        if a_acces_premium(apprenant):
            return Response(
                {"detail": "Cet apprenant a déjà un accès Premium actif."}, status=status.HTTP_400_BAD_REQUEST
            )

        plan = Plan.objects.filter(type=Plan.TypePlan.INDIVIDUEL, actif=True).first()
        if not plan:
            return Response(
                {"detail": "Aucune formule individuelle active n'est configurée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        aujourd_hui = timezone.now().date()
        abonnement = Abonnement.objects.create(
            user=apprenant,
            plan=plan,
            date_debut=aujourd_hui,
            date_fin=ajouter_mois(aujourd_hui, plan.duree_mois),
            statut=Abonnement.Statut.ACTIF,
        )
        log_activity(request.user, "ABONNEMENT_ACTIVATION", f"{apprenant.email} — {plan.nom}")
        return Response(AbonnementSerializer(abonnement).data, status=status.HTTP_201_CREATED)


class PlanPublicListView(generics.ListAPIView):
    """GET /api/plans/publics/ — formules actives, visibles par tout
    utilisateur (page d'accueil, tarifs et abonnement)."""

    serializer_class = PlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Plan.objects.filter(actif=True)


class MonAbonnementView(APIView):
    """GET /api/mon-abonnement/ — ce que l'utilisateur connecté voit de sa
    situation : couvert ou non, par quel plan, jusqu'à quand, à quel titre
    (personnel ou via son établissement). C'est la source du badge premium
    côté frontend — mais le vrai contrôle reste HasActiveSubscription."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        abonnement = abonnement_actif_pour(request.user)
        if not abonnement:
            return Response({"actif": False, "via": None, "plan": None, "date_fin": None, "abonnement_id": None})
        return Response(
            {
                "actif": True,
                "via": "etablissement" if abonnement.etablissement_id else "personnel",
                "plan": abonnement.plan.nom,
                "date_fin": abonnement.date_fin,
                # Seul un abonnement personnel est actionnable par son
                # titulaire (retrograder) — jamais celui d'un établissement,
                # qu'il ne gère pas lui-même.
                "abonnement_id": abonnement.id if not abonnement.etablissement_id else None,
            }
        )


class RetrograderAbonnementView(APIView):
    """POST /api/mon-abonnement/retrograder/ — l'utilisateur connecté
    annule lui-même son abonnement personnel actif, retour immédiat au
    plan Gratuit. Ne peut jamais toucher un abonnement d'établissement
    (le filtre `user=request.user` l'exclut structurellement, un tel
    abonnement ayant `user=None`)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        aujourd_hui = timezone.now().date()
        abonnement = (
            Abonnement.objects.filter(
                user=request.user, statut=Abonnement.Statut.ACTIF, date_fin__gte=aujourd_hui
            )
            .select_related("plan")
            .first()
        )
        if not abonnement:
            return Response(
                {"detail": "Vous n'avez pas d'abonnement personnel actif à rétrograder."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        abonnement.statut = Abonnement.Statut.ANNULE
        abonnement.save(update_fields=["statut"])
        log_activity(request.user, "ABONNEMENT_RETROGRADATION", str(abonnement))
        return Response({"detail": "Vous êtes repassé au plan Gratuit."})
