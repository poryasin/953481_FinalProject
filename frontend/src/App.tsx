import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/homepage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BookmarksPage from "./pages/BookmarksPage";
import FoldersPage from "./pages/FoldersPage";
import FolderDetailPage from "./pages/FolderDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/folders/:folderId" element={<FolderDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;