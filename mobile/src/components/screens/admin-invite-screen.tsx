import React from 'react';
import { ScrollView } from 'react-native';
import { InviteUserForm } from './invite-user-form';

export function AdminInviteScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <InviteUserForm />
    </ScrollView>
  );
}
