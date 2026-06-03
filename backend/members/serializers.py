from rest_framework import serializers

from .models import Member


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "membership_tier",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MemberDetailSerializer(serializers.ModelSerializer):
	"""Extended serializer for member profile/detail view with stats."""
	bookings_count = serializers.SerializerMethodField()
	attended_count = serializers.SerializerMethodField()
	no_show_count = serializers.SerializerMethodField()
	total_paid = serializers.SerializerMethodField()

	class Meta:
		model = Member
		fields = [
			"id",
			"first_name",
			"last_name",
			"email",
			"phone",
			"membership_tier",
			"is_active",
			"bookings_count",
			"attended_count",
			"no_show_count",
			"total_paid",
			"created_at",
			"updated_at",
		]
		read_only_fields = [
			"id",
			"bookings_count",
			"attended_count",
			"no_show_count",
			"total_paid",
			"created_at",
			"updated_at",
		]

	def get_bookings_count(self, obj):
		return obj.bookings.filter(status__in=["confirmed", "waitlist"]).count()

	def get_attended_count(self, obj):
		return obj.bookings.filter(attended=True).count()

	def get_no_show_count(self, obj):
		return obj.bookings.filter(no_show=True).count()

	def get_total_paid(self, obj):
		from django.db.models import Sum
		result = obj.bookings.filter(is_paid=True).aggregate(total=Sum("fee_amount"))
		return float(result["total"] or 0)
