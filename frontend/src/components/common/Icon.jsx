import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import * as LucideIcons from 'lucide-react';

/**
 * Unified Icon component with automatic theme-based coloring
 * - Black icons for light theme
 * - White icons for dark theme
 */
const Icon = ({ name, size = 20, color, className, ...props }) => {
  const { isDark } = useTheme();
  
  // Get the icon component from lucide-react
  const IconComponent = LucideIcons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }
  
  // Use provided color, or default to theme-based color
  const iconColor = color || (isDark ? '#ffffff' : '#000000');
  
  return (
    <IconComponent 
      size={size} 
      color={iconColor}
      className={className}
      {...props}
    />
  );
};

export default Icon;
