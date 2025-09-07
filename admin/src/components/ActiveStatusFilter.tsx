import React, { useState, useEffect, useRef } from 'react'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/vouchers'
import Accordion from './Accordion'

import '@/assets/css/status-filter.css'

interface ActiveStatusFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (values: boolean[]) => void
}

const ActiveStatusFilter = ({
  className,
  collapse,
  onChange
}: ActiveStatusFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<boolean[]>([])

  const activeRef = useRef<HTMLInputElement>(null)
  const inactiveRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && activeRef.current && inactiveRef.current) {
      activeRef.current.checked = true
      inactiveRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: boolean[]) => {
    if (onChange) {
      onChange(_values.length === 0 ? [true, false] : _values)
    }
  }

  const handleActiveChange = () => {
    const _values = [...values]
    const index = _values.indexOf(true)

    if (activeRef.current && activeRef.current.checked) {
      if (index === -1) {
        _values.push(true)
      }
    } else if (index > -1) {
      _values.splice(index, 1)
    }

    if (_values.length === 2) {
      setAllChecked(true)
    } else {
      setAllChecked(false)
    }

    setValues(_values)
    handleOnChange(_values)
  }

  const handleInactiveChange = () => {
    const _values = [...values]
    const index = _values.indexOf(false)

    if (inactiveRef.current && inactiveRef.current.checked) {
      if (index === -1) {
        _values.push(false)
      }
    } else if (index > -1) {
      _values.splice(index, 1)
    }

    if (_values.length === 2) {
      setAllChecked(true)
    } else {
      setAllChecked(false)
    }

    setValues(_values)
    handleOnChange(_values)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      if (activeRef.current) {
        activeRef.current.checked = false
      }
      if (inactiveRef.current) {
        inactiveRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
      handleOnChange([])
    } else {
      if (activeRef.current) {
        activeRef.current.checked = true
      }
      if (inactiveRef.current) {
        inactiveRef.current.checked = true
      }

      const _values = [true, false]
      setAllChecked(true)
      setValues(_values)
      handleOnChange(_values)
    }
  }

  return (
    <Accordion title={strings.ACTIVE} collapse={collapse} className={`${className ? `${className} ` : ''}active-status-filter`}>
      <ul className="status-list">
        <li>
          <input
            ref={activeRef}
            type="checkbox"
            className="status-checkbox"
            onChange={handleActiveChange}
          />
          <span className="status-label">{strings.ACTIVE}</span>
        </li>
        <li>
          <input
            ref={inactiveRef}
            type="checkbox"
            className="status-checkbox"
            onChange={handleInactiveChange}
          />
          <span className="status-label">{strings.INACTIVE}</span>
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

export default ActiveStatusFilter