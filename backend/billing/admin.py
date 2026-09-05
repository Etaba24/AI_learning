from django.contrib import admin

from .models import Abonnement, Etablissement, Plan


@admin.register(Etablissement)
class EtablissementAdmin(admin.ModelAdmin):
    list_display = ["nom", "code_invitation", "actif", "created_at"]
    search_fields = ["nom", "code_invitation"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    """Gestion technique des formules tarifaires — volontairement hors de
    l'interface app (réservée à un administrateur technique via /admin/),
    l'espace admin de l'app se limite à activer/annuler des comptes."""

    list_display = ["nom", "type", "prix_mensuel", "duree_mois", "max_membres", "actif"]
    list_filter = ["type", "actif"]
    search_fields = ["nom"]


@admin.register(Abonnement)
class AbonnementAdmin(admin.ModelAdmin):
    list_display = ["__str__", "plan", "statut", "date_debut", "date_fin"]
    list_filter = ["statut", "plan"]
    autocomplete_fields = ["user", "etablissement"]
