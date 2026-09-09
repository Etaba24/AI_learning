from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from core.models import JournalActivite


class AuditLogsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="strong-password-123",
            role=User.Role.ADMIN,
        )
        self.user = User.objects.create_user(
            email="student@example.com",
            password="strong-password-123",
            role=User.Role.STUDENT,
        )

    def test_login_creates_audit_log(self):
        response = self.client.post(reverse("login"), {"email": self.user.email, "password": "strong-password-123"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(JournalActivite.objects.filter(utilisateur=self.user, action="LOGIN").exists())

    def test_admin_can_fetch_audit_logs(self):
        JournalActivite.objects.create(utilisateur=self.user, action="LOGIN", detail="Connexion de test")
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(reverse("admin-logs"))

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(any(item["action"] == "LOGIN" for item in response.data["results"]))
