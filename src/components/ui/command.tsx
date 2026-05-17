"use client"

import * as React from "react"
import { Search } from "lucide-react"

interface Matter {
  id: string
  matterNumber: string
  clientName: string
  description: string
}

interface MatterSelectorProps {
  matters: Matter[]
  selectedMatterId: string | null
  onSelect: (matterId: string | null) => void
  onSearch: (query: string) => void
}

export function MatterSelector({
  matters,
  selectedMatterId,
  onSelect,
  onSearch,
}: MatterSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedMatter = matters.find((m) => m.id === selectedMatterId)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={selectedMatter ? `${selectedMatter.matterNumber} - ${selectedMatter.clientName}` : searchQuery}
          onChange={(e) => {
            if (!selectedMatter) {
              handleSearchChange(e)
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search matters..."
          className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-border bg-background shadow-lg">
          {matters.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No matters found
            </div>
          ) : (
            <div className="p-1">
              {matters.map((matter) => (
                <button
                  key={matter.id}
                  onClick={() => {
                    onSelect(matter.id)
                    setIsOpen(false)
                    setSearchQuery("")
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <div className="font-medium">{matter.matterNumber}</div>
                  <div className="text-xs text-muted-foreground">{matter.clientName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
