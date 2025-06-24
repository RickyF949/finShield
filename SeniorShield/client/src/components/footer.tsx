import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t-2 border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Shield className="text-blue-600 h-8 w-8 mr-3" />
            <span className="text-xl font-semibold text-blue-600">FinGuard</span>
          </div>
          <div className="flex flex-wrap justify-center space-x-6">
            <button className="text-lg text-gray-600 hover:text-blue-600 mb-2">Privacy Policy</button>
            <button className="text-lg text-gray-600 hover:text-blue-600 mb-2">Terms of Service</button>
            <button className="text-lg text-gray-600 hover:text-blue-600 mb-2">Contact Support</button>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-lg text-gray-600">© 2024 FinGuard. Your trusted financial guardian angel.</p>
        </div>
      </div>
    </footer>
  );
}
