import { PartialType } from "@nestjs/mapped-types";
import { CreateEventDto } from "./create-event-dto.js";


export class UpdateEventDTO extends PartialType(CreateEventDto){}