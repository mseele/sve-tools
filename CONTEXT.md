# SVE Tools

Admin workbench for the SV Eutingen club programme: the dashboard, event and
booking management, payment verification, and newsletter tools. Managers act on
the club's events and fitness courses through this tool.

## Language

### Foundations

**Event**:
A programme item the club offers — a fitness course or a one-off event. Moves
through a lifecycle from Draft to Archived.
_Avoid_: Course (a fitness course is still an **Event**)

**Event Type**:
The programme strand an **Event** belongs to: Fitness or Events.

**Lifecycle Status**:
The phase of an **Event** in its lifecycle: Draft, Review, Published, Running,
Finished, Closed, Archived. Published and Running **Events** form the active
programme; **Review** collects its prebookings ahead of it.

**Subscriber**:
A person who booked an **Event** — either enrolled or on its **Waiting List**.
_Avoid_: Booking (a booking is the act; the person is the **Subscriber**)

**Waiting List** (Warteliste):
The queue of **Subscribers** of a limited **Event** beyond its capacity.

### Availability

The phase vocabulary is borrowed from the website's context, which pins the same
machine for its booking flow.

**Unlimited**:
An **Event** without a capacity limit. It has no **Fill Rate** and its bookings
never close.
_Avoid_: Infinite, open-ended

**Subscribing**:
A limited **Event** with free capacity — new **Subscribers** enroll directly.

**WaitingList**:
A limited **Event** at capacity whose **Waiting List** still has room — new
**Subscribers** land on the **Waiting List**.

**FullyBooked**:
A limited **Event** at capacity with no **Waiting List** room left.

### Dashboard

**Dashboard Model**:
The typed view model the dashboard renders, derived purely from existing admin
data. The one contract between the dashboard page and its overview component.
_Avoid_: View state, store

**Event Card** (Event-Karte):
The uniform card per published **Event** or **Prebooking** — identity and
countdown, **Fill Rate**, money and payment footer. The dashboard's main
content; prebooking cards carry a Vorbuchung marker in the subtitle.
_Avoid_: Tile, panel

**Exception Row** (Problemzeile):
A red list row in the header box that demands action: the summed **Overdue
Payments** or a single **Lifecycle Straggler**. Everything else on the page
stays neutral.
_Avoid_: Alert, todo

**Fill Rate** (Auslastung):
Enrolled **Subscribers** against the capacity of a limited **Event**, as a
percentage. **Unlimited** events have none.
_Avoid_: Occupancy, utilization

**Lifecycle Straggler**:
A Running **Event** whose last date has already passed. It lingers in the
lifecycle and is due for the finished-events close.
_Avoid_: Stale event, overdue event

**Next Date**:
The nearest date of an **Event** that is not before today. An **Event** without
one is not upcoming; its card sorts last without a countdown.

**Open Payment** (offene Zahlung):
A booking whose payment has not been confirmed yet. It adds to the open money
on its event's card.
_Avoid_: Debt, outstanding invoice

**Overdue Payment** (überfällige Zahlung):
An **Open Payment** past its due date. Summed into one **Exception Row** linking
to the payments, and counted on its event's card.
_Avoid_: Late payment

**Prebooking** (Vorbuchung):
Bookings collected for an upcoming **Event** sitting in Review, not yet public —
the same selection the prebooking page emails. Prebookings render as full
**Event Cards** and join the campaign stats.

**Running Row**:
The neutral closing row for a Running **Event** that is not a **Lifecycle
Straggler**, counting down to its last date — information, not an alarm.
