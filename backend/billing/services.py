"""Logique métier des abonnements — le « videur ».

Un utilisateur a des droits premium si :
  1. il a lui-même un abonnement actif (B2C), OU
  2. son établissement a un abonnement actif (B2B).
Toute vérification d'accès premium dans le projet passe par ici : une
seule source de vérité, réutilisée par les permissions et les vues."""

from django.utils import timezone

from .models import Abonnement


def ajouter_mois(date, mois):
    """Ajoute `mois` mois à `date` sans dépendance externe (pas de
    python-dateutil dans le projet). Gère le débordement de jour (ex: 31
    janvier + 1 mois -> dernier jour de février, pas une erreur)."""
    import calendar

    mois_total = date.month - 1 + mois
    annee = date.year + mois_total // 12
    mois_resultat = mois_total % 12 + 1
    jour = min(date.day, calendar.monthrange(annee, mois_resultat)[1])
    return date.replace(year=annee, month=mois_resultat, day=jour)


def abonnement_actif_pour(user):
    """Renvoie l'Abonnement actif couvrant cet utilisateur, ou None.
    L'abonnement personnel prime (utile pour l'afficher dans le profil)."""
    if not user or not user.is_authenticated:
        return None

    aujourd_hui = timezone.now().date()

    personnel = (
        Abonnement.objects.filter(
            user=user, statut=Abonnement.Statut.ACTIF, date_fin__gte=aujourd_hui
        )
        .select_related("plan")
        .first()
    )
    if personnel:
        return personnel

    if user.etablissement_id and user.etablissement.actif:
        return (
            Abonnement.objects.filter(
                etablissement_id=user.etablissement_id,
                statut=Abonnement.Statut.ACTIF,
                date_fin__gte=aujourd_hui,
            )
            .select_related("plan")
            .first()
        )
    return None


def a_acces_premium(user):
    return abonnement_actif_pour(user) is not None


def a_acces_gratuit_outil(user, code_outil):
    """Un outil précis (IDE, tableur...) est gratuit pour cet utilisateur
    s'il a choisi, à l'inscription, au moins une catégorie qui débloque cet
    outil (Category.outils_associes) — jamais un abonnement complet, juste
    cet outil-là. N'accorde rien de plus que ce que l'admin a explicitement
    associé à chaque catégorie."""
    if not user.is_authenticated:
        return False
    return user.categories_interet.filter(outils_associes__code=code_outil).exists()


def split_full_name(nom_complet):
    """Découpe "Jean Dupont" en (prénom, nom) — même règle que le frontend
    (premier espace) pour rester cohérent entre inscription manuelle et
    import en masse : le 1er mot est le prénom, le reste est le nom."""
    trimmed = (nom_complet or "").strip()
    if not trimmed:
        return "", ""
    if " " not in trimmed:
        return trimmed, ""
    prenom, reste = trimmed.split(" ", 1)
    return prenom, reste.strip()


_NAME_HEADERS = {"nom", "name", "nom complet", "full name", "élève", "eleve", "student"}
_EMAIL_HEADERS = {"email", "e-mail", "compte google", "google", "mail", "adresse email"}


def parse_import_file(uploaded_file):
    """Lit un fichier .csv ou .xlsx envoyé par l'admin établissement et en
    extrait une liste de (nom, email). Détecte une éventuelle ligne d'en-tête
    par mots-clés (Nom/Email, insensible à la casse) ; sans en-tête reconnu,
    suppose colonne 1 = nom, colonne 2 = email — le format décrit par
    l'établissement ("nom" + "compte Google") rempli en salle de classe."""
    filename = (uploaded_file.name or "").lower()

    if filename.endswith(".xlsx"):
        import openpyxl

        classeur = openpyxl.load_workbook(uploaded_file, read_only=True, data_only=True)
        feuille = classeur.active
        lignes_brutes = [list(ligne) for ligne in feuille.iter_rows(values_only=True)]
    elif filename.endswith(".csv"):
        import csv
        import io

        contenu = uploaded_file.read().decode("utf-8-sig")
        lignes_brutes = list(csv.reader(io.StringIO(contenu)))
    else:
        raise ValueError("Format non supporté — utilisez un fichier .csv ou .xlsx.")

    if not lignes_brutes:
        return []

    en_tete = [str(cellule).strip().lower() if cellule is not None else "" for cellule in lignes_brutes[0]]
    a_un_en_tete = any(cellule in _NAME_HEADERS or cellule in _EMAIL_HEADERS for cellule in en_tete)

    index_nom, index_email = 0, 1
    if a_un_en_tete:
        for i, cellule in enumerate(en_tete):
            if cellule in _NAME_HEADERS:
                index_nom = i
            elif cellule in _EMAIL_HEADERS:
                index_email = i

    lignes_donnees = lignes_brutes[1:] if a_un_en_tete else lignes_brutes

    resultat = []
    for ligne in lignes_donnees:
        if not ligne or len(ligne) <= max(index_nom, index_email):
            continue
        nom = str(ligne[index_nom]).strip() if ligne[index_nom] is not None else ""
        email = str(ligne[index_email]).strip() if ligne[index_email] is not None else ""
        if nom or email:
            resultat.append((nom, email))
    return resultat
