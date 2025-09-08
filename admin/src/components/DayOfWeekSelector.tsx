import React from 'react'
import {
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography
} from '@mui/material'
import { strings } from '@/lang/vouchers'

interface Props {
  selectedDays: number[]
  onChange: (selectedDays: number[]) => void
}

const DayOfWeekSelector: React.FC<Props> = ({ selectedDays, onChange }) => {
  const daysOfWeek = [
    { value: 0, label: strings.SUNDAY },
    { value: 1, label: strings.MONDAY },
    { value: 2, label: strings.TUESDAY },
    { value: 3, label: strings.WEDNESDAY },
    { value: 4, label: strings.THURSDAY },
    { value: 5, label: strings.FRIDAY },
    { value: 6, label: strings.SATURDAY }
  ]

  const handleDayChange = (dayValue: number, checked: boolean) => {
    if (checked) {
      onChange([...selectedDays, dayValue])
    } else {
      onChange(selectedDays.filter(day => day !== dayValue))
    }
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {strings.ALLOWED_DAYS}
      </Typography>
      <FormGroup row>
        {daysOfWeek.map((day) => (
          <FormControlLabel
            key={day.value}
            control={
              <Checkbox
                checked={selectedDays.includes(day.value)}
                onChange={(e) => handleDayChange(day.value, e.target.checked)}
                size="small"
              />
            }
            label={day.label}
            sx={{ mr: 2 }}
          />
        ))}
      </FormGroup>
    </Box>
  )
}

export default DayOfWeekSelector