## ADDED Requirements

### Requirement: Select newsletter topics

The system SHALL allow the user to select one or more newsletter topics (General, Events, Fitness) to query subscribers for.

#### Scenario: Default selection

- **WHEN** the page loads
- **THEN** no topics are selected and no subscribers are shown

#### Scenario: Toggle topic

- **WHEN** user clicks a topic checkbox
- **THEN** the topic is toggled on/off and the subscriber list updates accordingly

### Requirement: Fetch newsletter subscribers

The system SHALL fetch newsletter subscribers from the backend for the selected topics.

#### Scenario: Successful fetch

- **WHEN** one or more topics are selected and the user triggers the fetch
- **THEN** the system calls `GET /api/admin/news/subscribers?topic=<comma-separated>` and displays the returned subscriber emails grouped by topic with a count per topic

#### Scenario: No subscribers

- **WHEN** the backend returns an empty list for the selected topics
- **THEN** the system shows an appropriate empty-state message

#### Scenario: Auth error

- **WHEN** the backend returns 401 or 403
- **THEN** the system handles the auth error via the existing `handleAuthError` mechanism (shows notification and logs out)
