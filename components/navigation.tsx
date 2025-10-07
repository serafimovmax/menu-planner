"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogOut, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const links = [
    { href: "/planner", label: "Меню" },
    { href: "/recipes", label: "Рецепты" },
    { href: "/shopping-list", label: "Список покупок" },
  ]

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("[v0] Error checking user:", error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast({
        title: "Выход выполнен",
        description: "До скорой встречи!",
      })
      setUser(null)
      router.refresh()
    } catch (error) {
      console.error("[v0] Logout error:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из аккаунта",
        variant: "destructive",
      })
    }
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/planner" className="text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              Menu Planner
            </Link>
            <div className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!loading && (
              <>
                {user ? (
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Выйти
                  </Button>
                ) : (
                  <Button variant="default" size="sm" asChild>
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-2" />
                      Войти
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
