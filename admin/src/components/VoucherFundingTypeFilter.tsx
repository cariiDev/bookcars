import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/vouchers'
import Accordion from './Accordion'

import '@/assets/css/status-filter.css'

interface VoucherFundingTypeFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (values: bookcarsTypes.VoucherFundingType[]) => void
}

const allFundingTypes = [
  bookcarsTypes.VoucherFundingType.Platform,
  bookcarsTypes.VoucherFundingType.Supplier,
  bookcarsTypes.VoucherFundingType.CoFunded
]

const VoucherFundingTypeFilter = ({
  className,
  collapse,
  onChange
}: VoucherFundingTypeFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.VoucherFundingType[]>([])

  const platformRef = useRef<HTMLInputElement>(null)
  const supplierRef = useRef<HTMLInputElement>(null)
  const coFundedRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && platformRef.current && supplierRef.current && coFundedRef.current) {
      platformRef.current.checked = true
      supplierRef.current.checked = true
      coFundedRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.VoucherFundingType[]) => {
    if (onChange) {
      onChange(_values.length === 0 ? allFundingTypes : _values)
    }
  }

  const handlePlatformChange = () => {
    const _values = [...values]
    const index = _values.indexOf(bookcarsTypes.VoucherFundingType.Platform)

    if (platformRef.current && platformRef.current.checked) {
      if (index === -1) {
        _values.push(bookcarsTypes.VoucherFundingType.Platform)
      }
    } else if (index > -1) {
      _values.splice(index, 1)
    }

    if (_values.length === allFundingTypes.length) {
      setAllChecked(true)
    } else {
      setAllChecked(false)
    }

    setValues(_values)
    handleOnChange(_values)
  }

  const handleSupplierChange = () => {
    const _values = [...values]
    const index = _values.indexOf(bookcarsTypes.VoucherFundingType.Supplier)

    if (supplierRef.current && supplierRef.current.checked) {
      if (index === -1) {
        _values.push(bookcarsTypes.VoucherFundingType.Supplier)
      }
    } else if (index > -1) {
      _values.splice(index, 1)
    }

    if (_values.length === allFundingTypes.length) {
      setAllChecked(true)
    } else {
      setAllChecked(false)
    }

    setValues(_values)
    handleOnChange(_values)
  }

  const handleCoFundedChange = () => {
    const _values = [...values]
    const index = _values.indexOf(bookcarsTypes.VoucherFundingType.CoFunded)

    if (coFundedRef.current && coFundedRef.current.checked) {
      if (index === -1) {
        _values.push(bookcarsTypes.VoucherFundingType.CoFunded)
      }
    } else if (index > -1) {
      _values.splice(index, 1)
    }

    if (_values.length === allFundingTypes.length) {
      setAllChecked(true)
    } else {
      setAllChecked(false)
    }

    setValues(_values)
    handleOnChange(_values)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      if (platformRef.current) {
        platformRef.current.checked = false
      }
      if (supplierRef.current) {
        supplierRef.current.checked = false
      }
      if (coFundedRef.current) {
        coFundedRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
      handleOnChange([])
    } else {
      if (platformRef.current) {
        platformRef.current.checked = true
      }
      if (supplierRef.current) {
        supplierRef.current.checked = true
      }
      if (coFundedRef.current) {
        coFundedRef.current.checked = true
      }

      setAllChecked(true)
      setValues(allFundingTypes)
      handleOnChange(allFundingTypes)
    }
  }

  return (
    <Accordion title={strings.FUNDING_TYPE} collapse={collapse} className={`${className ? `${className} ` : ''}voucher-funding-type-filter`}>
      <ul className="status-list">
        <li>
          <input
            ref={platformRef}
            type="checkbox"
            className="status-checkbox"
            onChange={handlePlatformChange}
          />
          <span className="status-label">{strings.PLATFORM}</span>
        </li>
        <li>
          <input
            ref={supplierRef}
            type="checkbox"
            className="status-checkbox"
            onChange={handleSupplierChange}
          />
          <span className="status-label">{strings.SUPPLIER_FUNDED}</span>
        </li>
        <li>
          <input
            ref={coFundedRef}
            type="checkbox"
            className="status-checkbox"
            onChange={handleCoFundedChange}
          />
          <span className="status-label">{strings.CO_FUNDED}</span>
        </li>
      </ul>
      <div className="filter-actions">
        <span
          onClick={handleUncheckAllChange}
          className="uncheckall"
          role="button"
          tabIndex={0}
        >
          {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
        </span>
      </div>
    </Accordion>
  )
}

export default VoucherFundingTypeFilter