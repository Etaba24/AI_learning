from django.contrib import admin

from .models import ConversationIA


@admin.register(ConversationIA)
class ConversationIAAdmin(admin.ModelAdmin):
    list_display = ("apprenant", "lecon", "created_at")
    search_fields = ("apprenant__email", "question", "reponse")
    readonly_fields = ("apprenant", "lecon", "question", "reponse", "created_at", "updated_at")

    def has_add_permission(self, request):
        # Rempli uniquement par le futur service IA, jamais à la main.
        return False
