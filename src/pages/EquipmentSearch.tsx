import { useState } from "react";
import { Mountain, Search, Filter, MapPin, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const EquipmentSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    "All",
    "Hiking & Backpacking",
    "Climbing",
    "Skiing & Snowboarding",
    "Cycling",
    "Camping",
    "Water Sports",
    "Mountain Biking",
  ];

  // Mock data for demonstration
  const mockEquipment = [
    {
      id: "1",
      title: "Professional Hiking Backpack",
      description:
        "High-quality 65L backpack perfect for multi-day hiking trips",
      dailyRate: 25,
      location: "San Francisco, CA",
      rating: 4.8,
      reviewCount: 12,
      image: "/api/placeholder/300/200",
      category: "Hiking & Backpacking",
    },
    {
      id: "2",
      title: "Rock Climbing Harness",
      description: "Comfortable and safe climbing harness for all skill levels",
      dailyRate: 15,
      location: "Oakland, CA",
      rating: 4.9,
      reviewCount: 8,
      image: "/api/placeholder/300/200",
      category: "Climbing",
    },
    {
      id: "3",
      title: "Mountain Bike",
      description: "Full-suspension mountain bike for trail riding",
      dailyRate: 45,
      location: "Berkeley, CA",
      rating: 4.7,
      reviewCount: 15,
      image: "/api/placeholder/300/200",
      category: "Mountain Biking",
    },
  ];

  const filteredEquipment = mockEquipment.filter((equipment) => {
    const matchesSearch =
      equipment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      equipment.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || equipment.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Mountain className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-gray-900">RentAloo</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/register/renter">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Find Equipment
          </h2>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="text-sm"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Additional Filters */}
          <div className="flex flex-wrap gap-4 items-center text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Location: San Francisco Bay Area</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Available dates</span>
            </div>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-gray-600">
            {filteredEquipment.length} equipment found
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory !== "all" && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Equipment Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((equipment) => (
            <Card
              key={equipment.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <Mountain className="h-12 w-12" />
                </div>
                <div className="absolute top-2 right-2">
                  <span className="bg-white px-2 py-1 rounded text-xs font-medium">
                    {equipment.category}
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {equipment.title}
                  </h3>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      ${equipment.dailyRate}
                    </div>
                    <div className="text-sm text-gray-500">per day</div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {equipment.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{equipment.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{equipment.rating}</span>
                    <span>({equipment.reviewCount})</span>
                  </div>
                </div>

                <Button className="w-full">View Details</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredEquipment.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Mountain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No equipment found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default EquipmentSearch;



