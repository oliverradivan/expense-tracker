import React from 'react';
import { 
  Home, 
  History, 
  List, 
  BarChart2, 
  Settings 
} from 'lucide-react';

const NavBar = ({ activeIndex, onNavigate }) => {
  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard', index: 0 },
    { name: 'History', icon: History, path: '/history', index: 1 },
    { name: 'Log', icon: List, path: '/log', index: 2 },
    { name: 'Review', icon: BarChart2, path: '/review', index: 3 },
    { name: 'Settings', icon: Settings, path: '/settings', index: 4 },
  ];

  return (
    <div className="nav-bar">
      {navItems.map((item) => (
        <div
          key={item.name}
          className={`nav-item ${activeIndex === item.index ? 'active' : ''}`}
          onClick={() => {
            onNavigate(item.path);
          }}
        >
          <item.icon size={24} />
          <span className="nav-label">{item.name}</span>
        </div>
      ))}
    </div>
  );
};

export default NavBar;