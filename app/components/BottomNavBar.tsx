import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsVisible(window.innerWidth < 768);
    };
    
    // Check on mount and window resize
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { 
      label: "Katalog", 
      href: "/", 
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      )
    },
    { 
      label: "Checkout", 
      href: "/checkout",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      )
    },
    { 
      label: "Lacak", 
      href: "/lacak/demo-awb",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.25 15.75h-1.5a6 6 0 1 1 6-6v2.25m0 0 3-3m-3 3-3-3" />
          <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 13.5h-12v2.625c0 1.035.84 1.875 1.875 1.875h8.25c1.035 0 1.875-.84 1.875-1.875V13.5z" />
        </svg>
      )
    },
    { 
      label: "Profil", 
      href: "/admin",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
  ];

  // Always render the component, but control visibility with CSS
  // This ensures it doesn't completely unmount during navigation
  
  // Helper function to check if a link is active
  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };
  
  // Set display style based on visibility
  const displayStyle = isVisible ? {} : { display: 'none' };

  return (
    <div className="bottom-nav-bar" style={displayStyle}>
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`bottom-nav-item${active ? " is-active" : ""}`}
            onClick={(e) => {
              // Prevent default to avoid page reload
              e.preventDefault();
              
              // Add ripple effect on click
              const ripple = document.createElement("span");
              const rect = e.currentTarget.getBoundingClientRect();
              const size = Math.max(rect.width, rect.height);
              const x = e.clientX - rect.left - size / 2;
              const y = e.clientY - rect.top - size / 2;
              
              ripple.style.cssText = `
                position: absolute;
                top: ${y}px;
                left: ${x}px;
                width: ${size}px;
                height: ${size}px;
                background: rgba(0,0,0,0.1);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
              `;
              
              e.currentTarget.appendChild(ripple);
              
              // Navigate programmatically after a small delay to allow ripple effect
              setTimeout(() => {
                navigate(item.href);
                ripple.remove();
              }, 150);
            }}
          >
            <div className="bottom-nav-icon">{item.icon}</div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}