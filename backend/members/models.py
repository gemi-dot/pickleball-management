from django.db import models


class Member(models.Model):
	TIER_BASIC = "basic"
	TIER_PREMIUM = "premium"
	TIER_PRO = "pro"
	MEMBERSHIP_TIER_CHOICES = [
		(TIER_BASIC, "Basic"),
		(TIER_PREMIUM, "Premium"),
		(TIER_PRO, "Pro"),
	]

	first_name = models.CharField(max_length=100)
	last_name = models.CharField(max_length=100)
	email = models.EmailField(unique=True)
	phone = models.CharField(max_length=30, blank=True)
	membership_tier = models.CharField(
		max_length=20,
		choices=MEMBERSHIP_TIER_CHOICES,
		default=TIER_BASIC,
	)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["last_name", "first_name"]

	def __str__(self) -> str:
		return f"{self.first_name} {self.last_name}".strip()
