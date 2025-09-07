import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/vouchers'
import Search from '@/components/Search'
import VoucherList from '@/components/VoucherList'
import InfoBox from '@/components/InfoBox'
import SupplierFilter from '@/components/SupplierFilter'
import ActiveStatusFilter from '@/components/ActiveStatusFilter'
import VoucherFundingTypeFilter from '@/components/VoucherFundingTypeFilter'
import * as helper from '@/utils/helper'

import '@/assets/css/vouchers.css'

const Vouchers = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(-1)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [activeStatuses, setActiveStatuses] = useState<boolean[]>([true, false])
  const [fundingTypes, setFundingTypes] = useState<bookcarsTypes.VoucherFundingType[]>([bookcarsTypes.VoucherFundingType.Platform, bookcarsTypes.VoucherFundingType.Supplier, bookcarsTypes.VoucherFundingType.CoFunded])

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleVoucherListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Voucher> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleVoucherDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSuppliers(newSuppliers)
  }

  const handleActiveStatusFilterChange = (newActiveStatuses: boolean[]) => {
    setActiveStatuses(newActiveStatuses)
  }

  const handleFundingTypeFilterChange = (newFundingTypes: bookcarsTypes.VoucherFundingType[]) => {
    setFundingTypes(newFundingTypes)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    if (_user && _user.type === bookcarsTypes.UserType.Supplier) {
      // If supplier is logged in, filter by their ID
      setSuppliers([_user._id!])
    } else {
      // Admin can see all suppliers
      setSuppliers([])
      // Fetch all suppliers for the filter
      try {
        const allSuppliersData = await import('@/services/SupplierService').then(service => service.getAllSuppliers())
        setAllSuppliers(allSuppliersData)
      } catch (err) {
        console.error('Failed to fetch suppliers:', err)
        setAllSuppliers([])
      }
    }
    setActiveStatuses([true, false]) // Show all vouchers by default
    setFundingTypes([bookcarsTypes.VoucherFundingType.Platform, bookcarsTypes.VoucherFundingType.Supplier, bookcarsTypes.VoucherFundingType.CoFunded]) // Show all funding types by default
  }

  const admin = helper.admin(user)

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="vouchers">
          <div className="col-1">
            <div className="col-1-container">
              <Search className="search" onSubmit={handleSearch} />

              {admin && (
                <Button
                  type="submit"
                  variant="contained"
                  className="btn-primary cl-new-voucher"
                  size="small"
                  onClick={() => navigate('/create-voucher')}
                >
                  {strings.NEW_VOUCHER}
                </Button>
              )}

              {rowCount > 0 && (
                <InfoBox
                  value={`${rowCount} ${rowCount > 1 ? strings.VOUCHERS : strings.VOUCHER}`}
                  className="voucher-count"
                />
              )}

              {admin && (
                <SupplierFilter
                  suppliers={allSuppliers}
                  className="cl-supplier-filter"
                  onChange={handleSupplierFilterChange}
                />
              )}

              <ActiveStatusFilter
                onChange={handleActiveStatusFilterChange}
                className="cl-active-status-filter"
              />

              <VoucherFundingTypeFilter
                onChange={handleFundingTypeFilterChange}
                className="cl-voucher-funding-type-filter"
              />
            </div>
          </div>
          <div className="col-2">
            <VoucherList
              user={user}
              keyword={keyword}
              suppliers={suppliers}
              activeStatuses={activeStatuses}
              fundingTypes={fundingTypes}
              onLoad={handleVoucherListLoad}
              onDelete={handleVoucherDelete}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Vouchers
