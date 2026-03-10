import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ title, subtitle }) {
  const { colors } = useTheme();
  return (
    <div className="mb-6">
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>{title}</h1>
      {subtitle && <p style={{ color: colors.textMuted, fontSize: '14px' }}>{subtitle}</p>}
    </div>
  );
}
