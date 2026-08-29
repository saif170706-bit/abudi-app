import React, { useState } from 'react';
import { Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from './button';

export function DeadlineField({
  value,
  onChange,
  mode = 'date',
}: {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime';
}) {
  const [show, setShow] = useState(false);

  const label =
    mode === 'datetime'
      ? value.toLocaleString('da-DK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <Button variant="outline" onPress={() => setShow(true)}>
        {label}
      </Button>
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={(_, selected) => {
            setShow(false);
            if (selected) onChange(selected);
          }}
        />
      )}
    </>
  );
}
