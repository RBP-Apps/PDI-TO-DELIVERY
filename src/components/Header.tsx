import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-200/50 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 min-h-[70px]">
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-3 text-gray-600 hover:text-gray-800 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Welcome message - responsive */}
          <div className="hidden md:block">
            <h2 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Welcome back, {user?.username}
            </h2>
            <p className="text-sm text-gray-600 font-medium">
              Manage your delivery operations
            </p>
          </div>
        </div>

        {/* Mobile welcome */}
        <div className="md:hidden flex-1 ml-4 overflow-hidden">
          <h2 className="text-base font-semibold text-gray-900 truncate bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Welcome, {user?.username}
          </h2>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center px-5 py-2.5 space-x-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg border border-red-400/20"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
