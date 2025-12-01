import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle,
  FileText,
  Package,
  CreditCard,

} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Planning", href: "/planning", icon: ClipboardList },
    { name: "Approval", href: "/approval", icon: CheckCircle },
    { name: "PO Generator", href: "/po-generator", icon: FileText },
    { name: "PO History", href: "/po-history", icon: FileText },
    { name: "Received", href: "/received", icon: Package },
    { name: "Report", href:"/Report", icon:Package},
    { name: "Payment", href: "/payment", icon: CreditCard },
    { name: "Payment History", href: "/payment-history", icon: CreditCard },
  ];


  const userPages = user?.pages || [];

  // console.log("userPages:", userPages);
  
const filteredNavigation = navigation.filter(item => 
  userPages.includes(item.name)
);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
        } fixed md:relative md:translate-x-0 md:opacity-100 transition-all duration-300 ease-in-out z-50 md:z-auto w-64 md:w-72 min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 shadow-2xl md:shadow-xl border-r border-gray-200/50 rounded-r-3xl md:rounded-none`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg">
              <img
            src={"Images/RBPLogo.jpeg"}
            alt="Company Logo"
            style={{
              height: "50px",
              width: "auto",
              margin: "0 auto",
              display: "block",
            }}
          />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                PURCHASE PLANNING
              </h1>
              <p className="text-sm text-gray-600">FMS System</p>
            </div>
          </div>
        </div>

        <nav className="px-3 mt-6 pb-16">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <li key={item.name} className="group">
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-900 hover:shadow-md"
                      }`
                    }
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 transition-all duration-200 ${
                        location.pathname === item.href
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-600 group-hover:scale-110"
                      }`}
                    />
                    <span className="transition-all duration-200 group-hover:translate-x-1">
                      {item.name}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {user && (
          <div className="absolute bottom-4 inset-x-4">
            <div className="p-3 bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/50 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-md">
                  <span className="text-sm font-bold text-white">
                    {user.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-600 capitalize font-medium">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
