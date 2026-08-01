import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-gray-500 text-sm">
        React + TypeScript + Vite - 主流技术栈工程
      </footer>
    </div>
  )
}
