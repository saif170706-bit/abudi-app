'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent as OriginalDialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import type { UserData } from '@/types';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface StudentNumberModalProps {
  user: User;
  userData: UserData;
  onSaved: (newUserData: UserData) => void;
}

const formSchema = z.object({
  studentNumber: z.string().min(1, { message: 'Elevnummer er påkrævet.' }),
});

const CustomDialogContent = React.forwardRef<
    React.ElementRef<typeof OriginalDialogContent>,
    React.ComponentPropsWithoutRef<typeof OriginalDialogContent> & { hideCloseButton?: boolean }
>(({ children, hideCloseButton, ...props }, ref) => (
    <OriginalDialogContent {...props} ref={ref}>
        {children}
        {!hideCloseButton && (
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogClose>
        )}
    </OriginalDialogContent>
));
CustomDialogContent.displayName = 'CustomDialogContent';


export function StudentNumberModal({ user, userData, onSaved }: StudentNumberModalProps) {
  const { tGlobal } = useGlobalTranslation();

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentNumber: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    const studentDocRef = doc(db, 'students', user.uid);
    const updatePayload = { studentNumber: values.studentNumber };

    try {
      await updateDoc(studentDocRef, updatePayload);

      toast({
        variant: "primary",
        title: 'Elevnummer Gemt!',
        description: 'Dit elevnummer er blevet opdateret.',
      });

      const newUserData: UserData = {
        ...userData,
        studentNumber: values.studentNumber,
      };
      onSaved(newUserData);
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: studentDocRef.path,
            operation: 'update',
            requestResourceData: updatePayload
        }));
      console.error('Error updating student number:', error);
      toast({
        variant: 'destructive',
        title: 'Fejl',
        description: 'Kunne ikke gemme elevnummer. Kontakt en administrator.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <CustomDialogContent className="sm:max-w-[425px]" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Velkommen!</DialogTitle>
          <DialogDescription>
            Indtast venligst dit elevnummer for at fortsætte. Dette er en engangshandling.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            <FormField
              control={form.control}
              name="studentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Elevnummer</FormLabel>
                  <FormControl>
                    <Input placeholder={tGlobal("Fx. 12345")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gem
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </CustomDialogContent>
    </Dialog>
  );
}
