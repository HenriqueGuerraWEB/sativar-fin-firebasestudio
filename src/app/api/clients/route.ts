import { NextRequest, NextResponse } from 'next/server';
import {
  getClients,
  addClient,
  updateClient,
  deleteClient
} from '../../../ai/flows/clients-flow';

console.log('[API] clients.ts loaded');

export async function GET() {
  try {
    console.log('[API] Fetching clients...');
    const clients = await getClients();
    console.log('[API] Clients fetched successfully:', clients.length);
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('[API] Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const client = await addClient(data);
    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error adding client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    const updated = await updateClient(id, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API] Error updating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error deleting client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
