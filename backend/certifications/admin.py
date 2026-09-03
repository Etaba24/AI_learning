from django.contrib import admin

from .models import Certification


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("apprenant", "formation", "identifiant_public", "created_at")
    search_fields = ("apprenant__email", "formation__titre", "identifiant_public")
    readonly_fields = ("identifiant_public", "created_at", "updated_at")
