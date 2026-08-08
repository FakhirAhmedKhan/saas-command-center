# Analytics Privacy Behavior

## Stored identifiers

The tracker creates:

- A first-party visitor identifier in localStorage.
- A first-party session identifier in localStorage.
- No cookies.
- No fingerprint.

The session expires after 30 minutes of inactivity.

## IP addresses

The API does not store raw IP addresses.

It stores a SHA-256 hash generated from:

- A private server-side salt.
- The incoming IP address.

The hash supports future approximate visitor and abuse analysis without retaining the raw IP.

## User agent

The API stores the browser user-agent string, limited to 512 characters.

Phase 10 may parse it into browser, operating system, and device dimensions.

## URLs

The tracker and API both:

- Remove URL fragments.
- Remove credentials.
- Remove sensitive query parameters such as tokens, passwords, session IDs, API keys, email, codes, and OTP values.
- Limit URL length.

## Forms and page content

The tracker does not capture:

- Form values.
- Input text.
- Password fields.
- Click text.
- Page HTML.
- DOM content.
- Clipboard content.

## Custom events

Custom-event properties:

- Are limited to 20 keys.
- Support only strings, numbers, booleans, and simple arrays.
- Reject sensitive property names.
- Limit string length.

Applications must not send personal, financial, authentication, health, or secret information as custom-event properties.

## Do Not Track

The tracker respects browser Do Not Track by default.

It can be disabled with:

`data-respect-dnt="false"`

## Consent

For jurisdictions requiring prior consent, install with:

`data-require-consent="true"`

Then grant consent through:

```js
window.CommandCenterAnalytics?.consent('grant');
```
