// @vitest-environment jsdom
import { Breadcrumbs } from './breadcrumbs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Breadcrumbs', () => {
  it('renders nothing when given an empty item list', () => {
    const { container } = render(<Breadcrumbs items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link for every item except the last', () => {
    render(<Breadcrumbs items={[{ label: 'Workspaces', href: '/workspaces' }, { label: 'Acme Corp', href: '/workspaces/acme' }, { label: 'Settings' }]} />);

    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute('href', '/workspaces');
    expect(screen.getByRole('link', { name: 'Acme Corp' })).toHaveAttribute('href', '/workspaces/acme');
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('marks only the last item as the current page', () => {
    render(<Breadcrumbs items={[{ label: 'Workspaces', href: '/workspaces' }, { label: 'Settings' }]} />);

    expect(screen.getByText('Settings')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Workspaces' })).not.toHaveAttribute('aria-current');
  });

  it('renders the last item as plain text even when it has an href, instead of a clickable link', () => {
    render(<Breadcrumbs items={[{ label: 'Current page', href: '/current' }]} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Current page')).toHaveAttribute('aria-current', 'page');
  });

  it('renders an item with no href as plain, non-current text when it is not last', () => {
    render(<Breadcrumbs items={[{ label: 'No link here' }, { label: 'Final page' }]} />);

    const middle = screen.getByText('No link here');

    expect(middle.tagName).toBe('SPAN');
    expect(middle).not.toHaveAttribute('aria-current');
  });
});
