import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('shows initials without image', () => {
    render(<Avatar initials="MM" />);
    expect(screen.getByText('MM')).toBeInTheDocument();
  });

  it('shows the profile picture and falls back to initials if it cannot be loaded', () => {
    const { container } = render(<Avatar initials="MM" imageUrl="/uploads/x.jpg" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/uploads/x.jpg');
    expect(screen.queryByText('MM')).not.toBeInTheDocument();

    fireEvent.error(img);
    expect(screen.getByText('MM')).toBeInTheDocument();
  });
});
