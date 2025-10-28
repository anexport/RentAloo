import { Link } from "react-router-dom";
import { Mountain, Users, Shield, Star } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Mountain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">RentAloo</h1>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 text-gray-700 hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register/renter"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Rent Outdoor Equipment
            <span className="block text-primary">From Local Owners</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Discover and rent high-quality outdoor sports equipment from
            verified owners in your area. From hiking gear to climbing
            equipment, find everything you need for your next adventure.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/register/renter"
              className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
            >
              I want to rent equipment
            </Link>
            <Link
              to="/register/owner"
              className="px-8 py-4 bg-white text-primary text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg border-2 border-primary"
            >
              I want to list my equipment
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trusted Community</h3>
              <p className="text-gray-600">
                Connect with verified equipment owners and renters in your local
                outdoor community.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure & Safe</h3>
              <p className="text-gray-600">
                All transactions are protected with secure payments and
                comprehensive insurance coverage.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Quality Guaranteed</h3>
              <p className="text-gray-600">
                Every piece of equipment is verified for quality and maintained
                to the highest standards.
              </p>
            </div>
          </div>

          {/* Browse Equipment CTA */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-semibold mb-4">
              Ready to start your adventure?
            </h3>
            <p className="text-gray-600 mb-6">
              Browse available equipment and find the perfect gear for your next
              outdoor activity.
            </p>
            <Link
              to="/equipment"
              className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Equipment
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Mountain className="h-6 w-6" />
            <span className="text-xl font-bold">RentAloo</span>
          </div>
          <p className="text-gray-400">© 2024 RentAloo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
