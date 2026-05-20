CREATE TABLE "live_spectators" (
	"broadcaster_id" text NOT NULL,
	"spectator_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_spectators_broadcaster_id_spectator_id_pk" PRIMARY KEY("broadcaster_id","spectator_id")
);
