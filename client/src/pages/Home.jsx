import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);

  const features = [
    {
      icon: "⏱️",
      title: "Real-Time Timer",
      description: "Synchronized countdown timers that update instantly across all devices",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: "👥",
      title: "Live Participant Management",
      description: "Approve/reject join requests instantly with real-time participant sync",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: "🔔",
      title: "Zero Message Clutter",
      description: "Smart alerts without WhatsApp confusion - all updates in one place",
      color: "from-green-500 to-green-600",
    },
    {
      icon: "⚡",
      title: "Instant Notifications",
      description: "Guide and passengers receive instant status updates seamlessly",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: "🎯",
      title: "Session Control",
      description: "Pause, resume, and adjust break times on-the-fly with full control",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: "📱",
      title: "Mobile-First Design",
      description: "Fully responsive interface optimized for smartphones and tablets",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  const useCases = [
    {
      title: "Tour Guides",
      icon: "🎯",
      points: ["Create & manage tours", "Approve participants", "Control break sessions", "Track group status"],
      bgGradient: "from-blue-50 to-blue-100",
      borderColor: "border-blue-300",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Passengers",
      icon: "👥",
      points: ["Join with tour ID", "Wait for approval", "View live countdown", "Stay synchronized"],
      bgGradient: "from-green-50 to-green-100",
      borderColor: "border-green-300",
      buttonColor: "bg-green-600 hover:bg-green-700",
    },
  ];

  const stats = [
    { label: "Real-Time Users", value: "∞" },
    { label: "Synchronized", value: "100%" },
    { label: "Uptime", value: "24/7" },
    { label: "Response Time", value: "<100ms" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header/Navigation */}
        <nav className="flex justify-between items-center px-6 md:px-12 py-6 backdrop-blur-md">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            ✨ TourSync
          </div>
          <div className="hidden md:flex gap-6 text-sm text-gray-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#roles" className="hover:text-white transition">For</a>
            <a href="#cta" className="hover:text-white transition">Get Started</a>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 py-20 space-y-12">
          {/* Main Heading with Animation */}
          <div className="text-center space-y-6 max-w-4xl animate-fade-in">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-purple-500/30 backdrop-blur">
              <span className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-semibold">
                🚀 Real-Time Tour Coordination
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
              Tour Management Made
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Effortless
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Guides create tours, passengers join with one ID, and synchronized timers keep everyone on the same page. 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-semibold"> No more message chaos.</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 drop-shadow-lg">
            <button
              onClick={() => navigate("/create")}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              🎯 Create a Tour
            </button>
            <button
              onClick={() => navigate("/join")}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              👥 Join a Tour
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 w-full max-w-3xl">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 text-center hover:bg-white/10 transition"
              >
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 md:px-12 py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Packed with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Powerful Features
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need for seamless tour coordination
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className={`text-5xl mb-4 group-hover:scale-125 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Role-Based Section */}
        <section id="roles" className="px-6 md:px-12 py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Built for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Everyone
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {useCases.map((useCase, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${useCase.bgGradient} border-2 ${useCase.borderColor} rounded-2xl p-8 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2`}
                onMouseEnter={() => setActiveRole(idx)}
                onMouseLeave={() => setActiveRole(null)}
              >
                <div className="text-5xl mb-4">{useCase.icon}</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">{useCase.title}</h3>
                <ul className="space-y-3 mb-8">
                  {useCase.points.map((point, pidx) => (
                    <li
                      key={pidx}
                      className={`flex items-center gap-3 text-gray-700 transition-all duration-300 ${
                        activeRole === idx ? "translate-x-2" : ""
                      }`}
                    >
                      <span className="text-lg">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    navigate(idx === 0 ? "/create" : "/join")
                  }
                  className={`w-full py-3 ${useCase.buttonColor} text-white font-bold rounded-lg transition-all duration-300 hover:shadow-lg`}
                >
                  {idx === 0 ? "Start Creating" : "Start Joining"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 md:px-12 py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              How It
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Works
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { num: "1", title: "Create", desc: "Guide creates a tour", icon: "🎯" },
              { num: "2", title: "Share", desc: "Share unique tour ID", icon: "📤" },
              { num: "3", title: "Join", desc: "Passengers request to join", icon: "👥" },
              { num: "4", title: "Sync", desc: "Real-time timer & updates", icon: "⚡" },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 text-center h-full hover:bg-white/10 transition">
                  <div className="text-4xl mb-3">{step.icon}</div>
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                    {step.num}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 transform -translate-y-1/2">
                    <div className="text-2xl text-purple-400">→</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="px-6 md:px-12 py-24">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-purple-400/30 backdrop-blur rounded-3xl p-12 md:p-20 text-center space-y-8 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Ready to Transform Your Tours?
            </h2>
            <p className="text-gray-300 text-lg">
              Join guides and passengers managing smarter tours with real-time synchronization
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => navigate("/create")}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Get Started as Guide
              </button>
              <button
                onClick={() => navigate("/join")}
                className="px-8 py-4 border-2 border-purple-400 text-purple-300 hover:text-white hover:border-purple-300 font-bold rounded-xl hover:bg-purple-600/20 transition-all duration-300"
              >
                Join as Passenger
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-12 border-t border-white/10 backdrop-blur">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12 mb-12">
              <div>
                <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                  ✨ TourSync
                </div>
                <p className="text-gray-400 text-sm">
                  Revolutionizing real-time tour coordination with seamless synchronization
                </p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="hover:text-white cursor-pointer transition">Features</li>
                  <li className="hover:text-white cursor-pointer transition">How It Works</li>
                  <li className="hover:text-white cursor-pointer transition">Pricing</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="hover:text-white cursor-pointer transition">About</li>
                  <li className="hover:text-white cursor-pointer transition">Blog</li>
                  <li className="hover:text-white cursor-pointer transition">Contact</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
              <p>© 2026 TourSync. Built for smarter tour management</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .delay-2000 { animation-delay: 2s; }
        .delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}