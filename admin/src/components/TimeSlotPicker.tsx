import React from 'react'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography
} from '@mui/material'
import { Add, Remove } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/vouchers'

interface Props {
  timeSlots: bookcarsTypes.TimeSlot[]
  onChange: (timeSlots: bookcarsTypes.TimeSlot[]) => void
  error?: string
}

const TimeSlotPicker: React.FC<Props> = ({ timeSlots, onChange, error }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const addTimeSlot = () => {
    const newSlot: bookcarsTypes.TimeSlot = {
      startHour: 9,
      endHour: 17
    }
    onChange([...timeSlots, newSlot])
  }

  const removeTimeSlot = (index: number) => {
    const updatedSlots = timeSlots.filter((_, i) => i !== index)
    onChange(updatedSlots)
  }

  const updateTimeSlot = (index: number, field: 'startHour' | 'endHour', value: number) => {
    const updatedSlots = timeSlots.map((slot, i) => {
      if (i === index) {
        return { ...slot, [field]: value }
      }
      return slot
    })
    onChange(updatedSlots)
  }

  const formatHour = (hour: number) => {
    return hour.toString().padStart(2, '0') + ':00'
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {strings.ALLOWED_TIME_SLOTS}
      </Typography>
      
      {timeSlots.map((slot, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>{strings.START_HOUR}</InputLabel>
            <Select
              value={slot.startHour}
              onChange={(e) => updateTimeSlot(index, 'startHour', Number(e.target.value))}
              label={strings.START_HOUR}
              variant="standard"
            >
              {hours.map((hour) => (
                <MenuItem key={hour} value={hour}>
                  {formatHour(hour)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Typography variant="body2">-</Typography>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>{strings.END_HOUR}</InputLabel>
            <Select
              value={slot.endHour}
              onChange={(e) => updateTimeSlot(index, 'endHour', Number(e.target.value))}
              label={strings.END_HOUR}
              variant="standard"
            >
              {hours.map((hour) => (
                <MenuItem key={hour} value={hour}>
                  {formatHour(hour)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <IconButton
            onClick={() => removeTimeSlot(index)}
            size="small"
            color="error"
            title={strings.REMOVE_TIME_SLOT}
          >
            <Remove />
          </IconButton>
        </Box>
      ))}
      
      <IconButton
        onClick={addTimeSlot}
        size="small"
        color="primary"
        title={strings.ADD_TIME_SLOT}
      >
        <Add />
      </IconButton>
      
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}

export default TimeSlotPicker