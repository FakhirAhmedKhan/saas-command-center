# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase17\team-operations.spec.ts >> Phase 17 team operations >> re-fetches with unreadOnly when the "Unread only" checkbox is toggled
- Location: e2e\phase17\team-operations.spec.ts:609:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Unread only')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e12]:
    - link "Skip to content" [ref=e13] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=e14]:
      - complementary [ref=e15]:
        - generic [ref=e16]:
          - link "SC SaaS Command Center" [ref=e17] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=e18]: SC
            - generic [ref=e19]: SaaS Command Center
          - navigation "Primary" [ref=e20]:
            - link "Overview" [ref=e21] [cursor=pointer]:
              - /url: /dashboard
          - generic [ref=e27]:
            - generic [ref=e28]: A
            - generic [ref=e29]:
              - paragraph [ref=e30]: Account owner
              - paragraph [ref=e31]: admin@example.com
            - button "Sign out" [ref=e32] [cursor=pointer]
      - generic [ref=e36]:
        - banner [ref=e37]:
          - button "Search applications, websites… Ctrl K" [disabled] [ref=e39] [cursor=pointer]:
            - generic [ref=e43]: Search applications, websites…
            - generic [ref=e44]: Ctrl K
          - link "Notifications, 0 unread" [ref=e46] [cursor=pointer]:
            - /url: /notifications
            - generic [ref=e47]: 🔔
        - main [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e50]:
              - generic [ref=e51]:
                - heading "Notifications" [level=1] [ref=e52]
                - paragraph [ref=e53]: Invitations, incidents, deployments and processing failures.
              - button "Mark all read" [ref=e54] [cursor=pointer]
            - generic [ref=e55]:
              - button "All" [ref=e56] [cursor=pointer]
              - button "Unread" [ref=e58] [cursor=pointer]
              - button "Critical" [ref=e59] [cursor=pointer]
            - generic [ref=e60]:
              - heading "No notifications" [level=3] [ref=e65]
              - paragraph [ref=e66]: You are up to date.
```

# Test source

```ts
  534 |         status: 201,
  535 | 
  536 |         contentType: 'application/json',
  537 | 
  538 |         body: JSON.stringify({
  539 |           success: true,
  540 |         }),
  541 |       });
  542 |     });
  543 | 
  544 |     page.once('dialog', (dialog) => {
  545 |       void dialog.dismiss();
  546 |     });
  547 | 
  548 |     await page.goto(`/workspaces/${workspaceId}/settings/members`);
  549 | 
  550 |     await page
  551 |       .getByRole('button', {
  552 |         name: 'Revoke',
  553 |       })
  554 |       .click();
  555 | 
  556 |     expect(revokeCalled).toBe(false);
  557 |   });
  558 | 
  559 |   test('shows an empty state on the notifications page when there are no notifications', async ({ page }) => {
  560 |     await page.route('**/notifications?*', async (route) => {
  561 |       await route.fulfill({
  562 |         status: 200,
  563 | 
  564 |         contentType: 'application/json',
  565 | 
  566 |         body: JSON.stringify({
  567 |           items: [],
  568 | 
  569 |           nextCursor: null,
  570 |         }),
  571 |       });
  572 |     });
  573 | 
  574 |     await page.goto('/notifications');
  575 | 
  576 |     await expect(page.getByText('No notifications')).toBeVisible();
  577 | 
  578 |     await expect(page.getByText('You are up to date.')).toBeVisible();
  579 |   });
  580 | 
  581 |   test('marks all notifications as read via "Mark all read"', async ({ page }) => {
  582 |     let markAllCalled = false;
  583 | 
  584 |     await page.route('**/notifications/mark-all-read', async (route) => {
  585 |       markAllCalled = true;
  586 | 
  587 |       await route.fulfill({
  588 |         status: 201,
  589 | 
  590 |         contentType: 'application/json',
  591 | 
  592 |         body: JSON.stringify({
  593 |           updated: 1,
  594 |         }),
  595 |       });
  596 |     });
  597 | 
  598 |     await page.goto('/notifications');
  599 | 
  600 |     await page
  601 |       .getByRole('button', {
  602 |         name: 'Mark all read',
  603 |       })
  604 |       .click();
  605 | 
  606 |     expect(markAllCalled).toBe(true);
  607 |   });
  608 | 
  609 |   test('re-fetches with unreadOnly when the "Unread only" checkbox is toggled', async ({ page }) => {
  610 |     let lastUnreadOnlyParam: string | null = null;
  611 | 
  612 |     await page.route('**/notifications?*', async (route) => {
  613 |       const url = new URL(route.request().url());
  614 | 
  615 |       lastUnreadOnlyParam = url.searchParams.get('unreadOnly');
  616 | 
  617 |       await route.fulfill({
  618 |         status: 200,
  619 | 
  620 |         contentType: 'application/json',
  621 | 
  622 |         body: JSON.stringify({
  623 |           items: [],
  624 | 
  625 |           nextCursor: null,
  626 |         }),
  627 |       });
  628 |     });
  629 | 
  630 |     await page.goto('/notifications');
  631 | 
  632 |     expect(lastUnreadOnlyParam).not.toBe('true');
  633 | 
> 634 |     await page.getByText('Unread only').click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  635 | 
  636 |     await expect.poll(() => lastUnreadOnlyParam).toBe('true');
  637 |   });
  638 | 
  639 |   test('shows the unread count badge on the notification bell', async ({ page }) => {
  640 |     await page.route('**/notifications/unread-count', async (route) => {
  641 |       await route.fulfill({
  642 |         status: 200,
  643 | 
  644 |         contentType: 'application/json',
  645 | 
  646 |         body: JSON.stringify({
  647 |           count: 4,
  648 |         }),
  649 |       });
  650 |     });
  651 | 
  652 |     await page.goto(`/workspaces/${workspaceId}`);
  653 | 
  654 |     await expect(page.getByLabel('Notifications, 4 unread')).toBeVisible();
  655 | 
  656 |     await expect(page.getByText('4', { exact: true })).toBeVisible();
  657 |   });
  658 | 
  659 |   test('caps the notification bell badge display at "99+"', async ({ page }) => {
  660 |     await page.route('**/notifications/unread-count', async (route) => {
  661 |       await route.fulfill({
  662 |         status: 200,
  663 | 
  664 |         contentType: 'application/json',
  665 | 
  666 |         body: JSON.stringify({
  667 |           count: 150,
  668 |         }),
  669 |       });
  670 |     });
  671 | 
  672 |     await page.goto(`/workspaces/${workspaceId}`);
  673 | 
  674 |     await expect(page.getByLabel('Notifications, 150 unread')).toBeVisible();
  675 | 
  676 |     await expect(page.getByText('99+', { exact: true })).toBeVisible();
  677 |   });
  678 | });
  679 | 
```