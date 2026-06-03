from datetime import datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from courts.models import Court
from members.models import Member

from .models import Booking


class BookingValidationTests(TestCase):
	def setUp(self):
		self.member = Member.objects.create(
			first_name="Alex",
			last_name="Player",
			email="alex@example.com",
		)
		self.court = Court.objects.create(
			name="Court A",
			max_players=4,
			operating_open_time=time(6, 0),
			operating_close_time=time(22, 0),
			blackout_dates=[],
		)
		self.booking_date = timezone.localdate() + timedelta(days=1)

	def _aware(self, hour: int, minute: int = 0):
		dt = datetime.combine(self.booking_date, time(hour, minute))
		return timezone.make_aware(dt, timezone.get_current_timezone())

	def test_allows_valid_booking(self):
		booking = Booking(
			court=self.court,
			member=self.member,
			start_time=self._aware(9),
			end_time=self._aware(10),
			players_count=4,
			status=Booking.STATUS_CONFIRMED,
		)
		booking.full_clean()

	def test_prevents_double_booking_overlap(self):
		Booking.objects.create(
			court=self.court,
			member=self.member,
			start_time=self._aware(9),
			end_time=self._aware(10),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)
		booking = Booking(
			court=self.court,
			member=self.member,
			start_time=self._aware(9, 30),
			end_time=self._aware(10, 30),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)

		with self.assertRaisesMessage(ValidationError, "conflicts"):
			booking.full_clean()

	def test_enforces_court_capacity(self):
		small_court = Court.objects.create(
			name="Court B",
			max_players=2,
			operating_open_time=time(6, 0),
			operating_close_time=time(22, 0),
			blackout_dates=[],
		)
		booking = Booking(
			court=small_court,
			member=self.member,
			start_time=self._aware(11),
			end_time=self._aware(12),
			players_count=4,
			status=Booking.STATUS_CONFIRMED,
		)

		with self.assertRaisesMessage(ValidationError, "max_players"):
			booking.full_clean()

	def test_validates_operating_hours(self):
		booking = Booking(
			court=self.court,
			member=self.member,
			start_time=self._aware(5),
			end_time=self._aware(6),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)

		with self.assertRaisesMessage(ValidationError, "operating hours"):
			booking.full_clean()

	def test_blocks_blackout_dates(self):
		self.court.blackout_dates = [self.booking_date.isoformat()]
		self.court.save(update_fields=["blackout_dates"])

		booking = Booking(
			court=self.court,
			member=self.member,
			start_time=self._aware(14),
			end_time=self._aware(15),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)

		with self.assertRaisesMessage(ValidationError, "blackout date"):
			booking.full_clean()


class BookingWaitlistTests(TestCase):
	def setUp(self):
		self.member1 = Member.objects.create(
			first_name="Alex",
			last_name="Player1",
			email="alex@example.com",
		)
		self.member2 = Member.objects.create(
			first_name="Bob",
			last_name="Player2",
			email="bob@example.com",
		)
		self.member3 = Member.objects.create(
			first_name="Charlie",
			last_name="Player3",
			email="charlie@example.com",
		)
		self.court = Court.objects.create(
			name="Court A",
			max_players=4,
			operating_open_time=time(6, 0),
			operating_close_time=time(22, 0),
			blackout_dates=[],
		)
		self.booking_date = timezone.localdate() + timedelta(days=1)

	def _aware(self, hour: int, minute: int = 0):
		dt = datetime.combine(self.booking_date, time(hour, minute))
		return timezone.make_aware(dt, timezone.get_current_timezone())

	def test_promotes_single_waitlist_when_confirmed_cancelled(self):
		"""When confirmed booking is cancelled, the waitlist booking is promoted."""
		confirmed = Booking.objects.create(
			court=self.court,
			member=self.member1,
			start_time=self._aware(9),
			end_time=self._aware(10),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)
		waitlist = Booking.objects.create(
			court=self.court,
			member=self.member2,
			start_time=self._aware(9),
			end_time=self._aware(10),
			players_count=2,
			status=Booking.STATUS_WAITLIST,
		)

		# Cancel the confirmed booking
		confirmed.status = Booking.STATUS_CANCELLED
		confirmed.save()

		# Verify waitlist was promoted
		waitlist.refresh_from_db()
		self.assertEqual(waitlist.status, Booking.STATUS_CONFIRMED)

	def test_promotes_oldest_waitlist_fifo(self):
		"""When multiple waitlist bookings exist, the oldest is promoted (FIFO)."""
		confirmed = Booking.objects.create(
			court=self.court,
			member=self.member1,
			start_time=self._aware(11),
			end_time=self._aware(12),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)
		waitlist1 = Booking.objects.create(
			court=self.court,
			member=self.member2,
			start_time=self._aware(11),
			end_time=self._aware(12),
			players_count=2,
			status=Booking.STATUS_WAITLIST,
		)
		# Simulate later waitlist booking by updating created_at
		waitlist2 = Booking.objects.create(
			court=self.court,
			member=self.member3,
			start_time=self._aware(11),
			end_time=self._aware(12),
			players_count=2,
			status=Booking.STATUS_WAITLIST,
		)

		# Cancel the confirmed booking
		confirmed.status = Booking.STATUS_CANCELLED
		confirmed.save()

		# Verify oldest waitlist (waitlist1) was promoted
		waitlist1.refresh_from_db()
		waitlist2.refresh_from_db()
		self.assertEqual(waitlist1.status, Booking.STATUS_CONFIRMED)
		self.assertEqual(waitlist2.status, Booking.STATUS_WAITLIST)

	def test_does_not_promote_for_different_time_slot(self):
		"""Waitlist bookings for different times are not affected."""
		confirmed = Booking.objects.create(
			court=self.court,
			member=self.member1,
			start_time=self._aware(9),
			end_time=self._aware(10),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)
		waitlist_other_time = Booking.objects.create(
			court=self.court,
			member=self.member2,
			start_time=self._aware(14),
			end_time=self._aware(15),
			players_count=2,
			status=Booking.STATUS_WAITLIST,
		)

		# Cancel the confirmed booking
		confirmed.status = Booking.STATUS_CANCELLED
		confirmed.save()

		# Verify waitlist for different time remains waitlist
		waitlist_other_time.refresh_from_db()
		self.assertEqual(waitlist_other_time.status, Booking.STATUS_WAITLIST)

	def test_does_not_promote_for_different_court(self):
		"""Waitlist bookings on different courts are not affected."""
		other_court = Court.objects.create(
			name="Court B",
			max_players=4,
			operating_open_time=time(6, 0),
			operating_close_time=time(22, 0),
			blackout_dates=[],
		)
		confirmed = Booking.objects.create(
			court=self.court,
			member=self.member1,
			start_time=self._aware(13),
			end_time=self._aware(14),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)
		waitlist_other_court = Booking.objects.create(
			court=other_court,
			member=self.member2,
			start_time=self._aware(13),
			end_time=self._aware(14),
			players_count=2,
			status=Booking.STATUS_WAITLIST,
		)

		# Cancel the confirmed booking
		confirmed.status = Booking.STATUS_CANCELLED
		confirmed.save()

		# Verify waitlist on different court remains waitlist
		waitlist_other_court.refresh_from_db()
		self.assertEqual(waitlist_other_court.status, Booking.STATUS_WAITLIST)

	def test_no_promotion_when_no_waitlist_exists(self):
		"""When no waitlist booking exists, cancellation proceeds without promotion."""
		confirmed = Booking.objects.create(
			court=self.court,
			member=self.member1,
			start_time=self._aware(15),
			end_time=self._aware(16),
			players_count=2,
			status=Booking.STATUS_CONFIRMED,
		)

		# Cancel the confirmed booking (should not error)
		confirmed.status = Booking.STATUS_CANCELLED
		confirmed.save()

		confirmed.refresh_from_db()
		self.assertEqual(confirmed.status, Booking.STATUS_CANCELLED)
