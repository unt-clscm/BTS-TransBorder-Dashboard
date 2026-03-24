import { createContext, useContext } from 'react'

const FilterContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useFilterContext() {
  return useContext(FilterContext)
}

export default FilterContext
