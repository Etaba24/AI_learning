from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/google/", views.GoogleAuthView.as_view(), name="google_auth"),
    path("auth/google/confirm/", views.GoogleConfirmView.as_view(), name="google_confirm"),
    path(
        "auth/etablissement/rejoindre/",
        views.RejoindreEtablissementView.as_view(),
        name="etablissement_rejoindre",
    ),
    # Vue conforme au User.email : elle attend directement {"email": ..., "password": ...}.
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/ws-ticket/", views.WebSocketTicketView.as_view(), name="ws_ticket"),
    path("auth/password-change/", views.PasswordChangeView.as_view(), name="password_change"),
    path("auth/password-reset/", views.PasswordResetRequestView.as_view(), name="password_reset"),
    path(
        "auth/password-reset-confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("users/me/", views.MeView.as_view(), name="me"),
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
]
