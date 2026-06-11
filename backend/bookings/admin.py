from django.contrib import admin

from .models import Booking, Payment


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
	list_display = (
		"id",
		"court",
		"member",
		"start_time",
		"end_time",
		"players_count",
		"fee_amount",
		"is_paid",
		"status",
	)
	list_filter = ("status", "is_paid", "court")
	search_fields = ("member__first_name", "member__last_name", "court__name")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
	list_display = (
		"id",
		"booking",
		"method",
		"reference",
		"amount",
		"status",
		"paid_by",
		"payment_date",
		"created_at",
	)
	list_filter = ("status", "method", "paid_by")
	search_fields = ("reference", "booking__member__first_name", "booking__member__last_name")
