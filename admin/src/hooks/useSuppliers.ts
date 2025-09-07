import { useState, useEffect } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/utils/helper'

export const useSuppliers = (user?: bookcarsTypes.User | null) => {
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        if (!helper.admin(user)) {
          return
        }

        setLoading(true)
        const allSuppliers = await SupplierService.getAllSuppliers()
        setSuppliers(allSuppliers)
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchSuppliers()
    }
  }, [user])

  return { suppliers, loading }
}