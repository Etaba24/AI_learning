from django.contrib import admin

from .models import Inscription, Progression


@admin.register(Inscription)
class InscriptionAdmin(admin.ModelAdmin):
    list_display = ("apprenant", "formation", "statut", "created_at")
    list_filter = ("statut", "formation")
    search_fields = ("apprenant__email", "formation__titre")


@admin.register(Progression)
class ProgressionAdmin(admin.ModelAdmin):
    list_display = ("inscription", "lecon", "statut", "video_progression_percent", "score")
    list_filter = ("statut",)
