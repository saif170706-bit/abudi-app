
import * as z from 'zod';

export const eventFormSchema = z.object({
    title: z.string().min(1, { message: "Titel er påkrævet." }),
    description: z.string().min(1, { message: 'Beskrivelse er påkrævet.'}),
    registrationDeadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Ugyldig dato' }),
    capacity: z.coerce.number().min(0, { message: "Kapacitet skal være 0 eller højere." }),
    allowExternalRegistrations: z.boolean().default(false),
    formFields: z.array(z.object({
        id: z.string(),
        label: z.string().min(1, {message: 'Spørgsmåls Label er påkrævet'}),
        type: z.enum(['text', 'radio', 'checkbox']),
        required: z.boolean(),
        options: z.array(z.object({ value: z.string().min(1, {message: 'Valgmulighed må ikke være tom'}) })).optional(),
        maxSelections: z.coerce.number().optional(),
    })).optional(),
});

    