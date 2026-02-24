import { useEffect, useState, useRef } from "react";
import { MoreVertical } from "lucide-react";

export type MenuOption<T = any> = {
  label: string;
  icon?: React.ReactNode;
  onClick: (data: T) => void;
};

type DropdownMenuProps<T = any> = {
  id: string;
  options: MenuOption<T>[];
  data: T;
  className?: string;
};

export default function DropdownMenu<T = any>({
  options,
  data,
  className = "",
}: DropdownMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const handleOptionClick = (option: MenuOption<T>) => {
    option.onClick(data);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <MoreVertical
        className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        onClick={toggleMenu}
      />
      {isOpen && (
        <div className="absolute right-0 top-6 z-50 w-48 rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-1">
            {options.map((option, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors cursor-pointer"
                onClick={() => handleOptionClick(option)}
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
