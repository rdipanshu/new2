import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { BootSplash } from "./components/BootSplash";
import Home from "./pages/Home";
import Summary from "./pages/Summary";
import Skills from "./pages/Skills";
import Experience from "./pages/Experience";
import Certifications from "./pages/Certifications";
import Education from "./pages/Education";
import Activity from "./pages/Activity";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Resume from "./pages/Resume";
import NotFound from "./pages/NotFound";

const PAGE_TITLES = {
  "/": "Dipanshu Rana | Cybersecurity Specialist & Network Security Engineer",
  "/summary": "Summary | Dipanshu Rana",
  "/skills": "Skills & Arsenal | Dipanshu Rana",
  "/experience": "Experience | Dipanshu Rana",
  "/certifications": "Certifications & Badges | Dipanshu Rana",
  "/education": "Education | Dipanshu Rana",
  "/activity": "Activity & Honors | Dipanshu Rana",
  "/blog": "Security Write-ups | Dipanshu Rana",
  "/contact": "Contact | Dipanshu Rana",
  "/admin": "Admin Console | Dipanshu Rana",
  "/resume": "Resume | Dipanshu Rana",
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = PAGE_TITLES[pathname] || PAGE_TITLES["/"];
  }, [pathname]);
  return null;
};

function App() {
  return (
    <div className="App">
      <BootSplash />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/education" element={<Education />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="bottom-right" theme="dark" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
