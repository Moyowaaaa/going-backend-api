import { Controller, Get, Param } from '@nestjs/common';
import { TicketsService } from './tickets.service.js';


@Controller('tickets')
export class TicketsController {
    constructor(private readonly ticketService:TicketsService){}

    //GET tickets 
    @Get()
    findAll(){
        return this.ticketService.findAllTickets()
    }

  //GET ticket by Id '/tickets/:ticketId
  @Get(':ticketId')
  findOne(@Param('ticketId') ticketId: string){
      return this.ticketService.findOneById(ticketId)
  }

}
