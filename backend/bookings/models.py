from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone


class Booking(models.Model):
	STATUS_CONFIRMED = "confirmed"
	STATUS_WAITLIST = "waitlist"
	STATUS_CANCELLED = "cancelled"
	STATUS_CHOICES = [
		(STATUS_CONFIRMED, "Confirmed"),
		(STATUS_WAITLIST, "Waitlist"),
		(STATUS_CANCELLED, "Cancelled"),
	]

	PLAYERS_COUNT_CHOICES = [
		(2, "Singles"),
		(4, "Doubles"),
	]

	court = models.ForeignKey("courts.Court", on_delete=models.CASCADE, related_name="bookings")
	member = models.ForeignKey("members.Member", on_delete=models.CASCADE, related_name="bookings")
	start_time = models.DateTimeField()
	end_time = models.DateTimeField()
	players_count = models.IntegerField(choices=PLAYERS_COUNT_CHOICES)
	fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	is_paid = models.BooleanField(default=False)
	paid_at = models.DateTimeField(null=True, blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_CONFIRMED)
	attended = models.BooleanField(default=False, help_text="Whether member attended this booking")
	no_show = models.BooleanField(default=False, help_text="Whether member was a no-show")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-start_time"]

	def clean(self) -> None:
		if self.end_time <= self.start_time:
			raise ValidationError("end_time must be after start_time")

		if not self.court_id:
			return

		if self.players_count and self.court.max_players and self.players_count > self.court.max_players:
			raise ValidationError({"players_count": "players_count exceeds this court's max_players"})

		if self.status != self.STATUS_CANCELLED:
			overlap_qs = Booking.objects.filter(
				court_id=self.court_id,
				status=self.STATUS_CONFIRMED,
				start_time__lt=self.end_time,
				end_time__gt=self.start_time,
			)
			if self.pk:
				overlap_qs = overlap_qs.exclude(pk=self.pk)
			if overlap_qs.exists():
				raise ValidationError("Booking conflicts with an existing confirmed booking")

		local_start = timezone.localtime(self.start_time)
		local_end = timezone.localtime(self.end_time)
		open_time = self.court.operating_open_time
		close_time = self.court.operating_close_time

		if local_start.time() < open_time or local_end.time() > close_time:
			raise ValidationError("Booking time is outside court operating hours")

		blackout_dates = set(self.court.blackout_dates or [])
		if local_start.date().isoformat() in blackout_dates or local_end.date().isoformat() in blackout_dates:
			raise ValidationError("Booking falls on a blackout date")

	def __str__(self) -> str:
		return f"Booking #{self.pk}"

	@classmethod
	def get_next_waitlist_booking(cls, court_id: int, start_time, end_time):
		"""
		Find the oldest waitlist booking for the given court and time slot (FIFO).
		Returns the booking or None if no waitlist exists.
		"""
		return cls.objects.filter(
			court_id=court_id,
			status=cls.STATUS_WAITLIST,
			start_time=start_time,
			end_time=end_time,
		).order_by("created_at").first()

	def promote_from_waitlist(self) -> None:
		"""
		Promote the oldest waitlist booking for this court's time slot to confirmed.
		This should be called when any booking for that slot is cancelled.
		"""
		if not self.court_id:
			return

		next_booking = self.get_next_waitlist_booking(
			self.court_id, self.start_time, self.end_time
		)
		if next_booking:
			next_booking.status = self.STATUS_CONFIRMED
			next_booking.save(update_fields=["status", "updated_at"])


@receiver(post_save, sender=Booking)
def handle_booking_cancellation(sender, instance, created, **kwargs):
	"""
	When a confirmed booking is cancelled, automatically promote the oldest
	waitlist booking for the same slot to confirmed status.
	"""
	if created:
		return

	if instance.status == Booking.STATUS_CANCELLED:
		# Find and promote any confirmed booking that just got cancelled
		# by checking if this is now a cancellation
		instance.promote_from_waitlist()
