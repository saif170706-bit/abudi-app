'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, PlusCircle, Trash2, X } from 'lucide-react';
import * as z from 'zod';
import { eventFormSchema } from './event-form-schema';
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FormFieldBuilderProps {
    index: number;
    remove: (index: number) => void;
}

export default function FormFieldBuilder({ index, remove }: FormFieldBuilderProps) {
  const { tGlobal } = useGlobalTranslation();

  const { control, watch } = useFormContext<z.infer<typeof eventFormSchema>>();
  const fieldType = watch(`formFields.${index}.type`);

  const { fields: optionsFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `formFields.${index}.options`
  });

  const showOptions = fieldType === 'radio' || fieldType === 'checkbox';

  return (
    <div className="flex gap-2 items-start border p-4 rounded-lg bg-muted/50 relative">
      <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
      <div className="flex-grow space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={control}
            name={`formFields.${index}.label`}
            render={({ field }) => (
                <FormItem>
                <FormLabel>Spørgsmål / Label</FormLabel>
                <FormControl><Input {...field} placeholder={tGlobal("F.eks. 'Fulde Navn'")} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name={`formFields.${index}.type`}
            render={({ field }) => (
                <FormItem>
                <FormLabel>Felt Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="text">Tekstfelt</SelectItem>
                        <SelectItem value="radio">Enkeltvalg</SelectItem>
                        <SelectItem value="checkbox">Flere valg</SelectItem>
                    </SelectContent>
                </Select>
                </FormItem>
            )}
            />
        </div>

        {showOptions && (
          <div className="space-y-2 pl-6">
            <Label>Valgmuligheder</Label>
            {optionsFields.map((option, optionIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <FormField
                  control={control}
                  name={`formFields.${index}.options.${optionIndex}.value`}
                  render={({ field }) => (
                      <FormItem className="flex-grow">
                          <FormControl><Input {...field} placeholder={`Valgmulighed ${optionIndex + 1}`} /></FormControl>
                           <FormMessage />
                      </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ value: '' })}>
              Tilføj Valgmulighed
            </Button>
          </div>
        )}

        {fieldType === 'checkbox' && (
            <FormField
                control={control}
                name={`formFields.${index}.maxSelections`}
                render={({ field }) => (
                    <FormItem className="pl-6">
                        <FormLabel>Maks. antal valg</FormLabel>
                        <FormControl><Input type="number" {...field} placeholder={tGlobal("Udfyld for at begrænse (f.eks. 2)")} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}


         <FormField
            control={control}
            name={`formFields.${index}.required`}
            render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>Påkrævet</FormLabel>
                </FormItem>
            )}
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

    