import { createContext, useContext } from 'react'

const FilterContext = createContext(null)

export function useFilterContext() {
  return useContext(FilterContext)
}

export default FilterContext
