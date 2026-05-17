import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PipelineEntity } from '../database/pipeline.entity';
import type { FilteredMessage } from '@tg-pipeline/kafka-schemas';

@WebSocketGateway({
  cors: { origin: process.env['CORS_ORIGIN'] ?? true, credentials: true },
  path: '/ws/socket.io',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  // Map<pipelineId, Set<socketId>>
  private readonly subscriptions = new Map<string, Set<string>>();
  // Map<socketId, userId>
  private readonly socketUsers = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepo: Repository<PipelineEntity>,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.['token'] as string;
      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify<{ sub: string }>(token);
      this.socketUsers.set(socket.id, payload.sub);
      this.logger.log(`Client connected: ${socket.id} (user ${payload.sub})`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.socketUsers.delete(socket.id);
    for (const [pipelineId, sockets] of this.subscriptions) {
      sockets.delete(socket.id);
      if (sockets.size === 0) this.subscriptions.delete(pipelineId);
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { pipelineId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = this.socketUsers.get(socket.id);
    if (!userId) throw new WsException('Not authenticated');

    const pipeline = await this.pipelineRepo.findOne({
      where: { id: data.pipelineId, ownerId: userId },
    });
    if (!pipeline) throw new WsException('Pipeline not found or not owned by user');

    const sockets = this.subscriptions.get(data.pipelineId) ?? new Set();
    sockets.add(socket.id);
    this.subscriptions.set(data.pipelineId, sockets);

    return { subscribed: true, pipelineId: data.pipelineId };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { pipelineId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.subscriptions.get(data.pipelineId)?.delete(socket.id);
    return { unsubscribed: true };
  }

  broadcast(message: FilteredMessage) {
    const sockets = this.subscriptions.get(message.pipelineId);
    if (!sockets?.size) return;

    for (const socketId of sockets) {
      this.server.to(socketId).emit('message', message);
    }
  }
}
