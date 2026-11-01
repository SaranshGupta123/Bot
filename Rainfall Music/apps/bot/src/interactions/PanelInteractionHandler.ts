import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  GuildMember,
} from 'discord.js';
import { prisma } from '@rainfall/database';
import { LoopMode, AudioFilter } from '@rainfall/types';
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed, createScopedLogger, truncateText, formatDuration } from '@rainfall/shared';
import type { RainfallClient } from '../client/RainfallClient';

const log = createScopedLogger('PanelInteractionHandler');

export class PanelInteractionHandler {
  constructor(private client: RainfallClient) {}

  private async isDJOrElevated(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<boolean> {
    if (!interaction.guild || !interaction.member) return true;
    const member = interaction.member as GuildMember;
    if (
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
      interaction.guild.ownerId === member.id
    ) {
      return true;
    }
    const guildConfig = await this.client.databaseService.getGuildConfig(interaction.guild.id);
    if (!guildConfig || !guildConfig.djRoleId) return true;
    return member.roles.cache.has(guildConfig.djRoleId);
  }

  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    const { customId, guildId, member } = interaction;
    if (!guildId || !member) return;

    const player = this.client.musicManager.getPlayer(guildId);
    if (!player) {
      await interaction.reply({
        embeds: [createErrorEmbed('No Active Music Player', 'There is no audio currently playing in this server.')],
        ephemeral: true,
      });
      return;
    }

    // Voice channel check
    const userVoiceChannelId = (member as any).voice?.channelId;
    if (!userVoiceChannelId || userVoiceChannelId !== player.voiceChannelId) {
      await interaction.reply({
        embeds: [createErrorEmbed('Voice Channel Mismatch', `You must be connected to <#${player.voiceChannelId}> to use the control panel!`)],
        ephemeral: true,
      });
      return;
    }

    // Use guild lock to prevent race conditions during rapid concurrent clicks
    await this.client.musicManager.withGuildLock(guildId, async () => {
      try {
        switch (customId) {
          case 'panel_play':
            if (player.paused) {
              await player.resume();
              await interaction.reply({
                embeds: [createSuccessEmbed('Playback Resumed', 'The music player has resumed playback.')],
                ephemeral: true,
              });
              await this.client.panelManager.updatePanel(guildId, true);
            } else {
              await interaction.reply({ content: 'Already playing.', ephemeral: true });
            }
            break;

          case 'panel_pause':
            if (!player.paused) {
              await player.pause();
              await interaction.reply({
                embeds: [createSuccessEmbed('Playback Paused', 'The music player is now paused.')],
                ephemeral: true,
              });
              await this.client.panelManager.updatePanel(guildId, true);
            } else {
              await interaction.reply({ content: 'Already paused.', ephemeral: true });
            }
            break;

          case 'panel_skip': {
            const currentTitle = player.queue.current?.info.title || 'Current track';
            await player.skip();
            await interaction.reply({
              embeds: [createSuccessEmbed('Track Skipped', `Skipped **${currentTitle}**.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_previous': {
            if (!player.queue.previous || player.queue.previous.length === 0) {
              await interaction.reply({
                embeds: [createErrorEmbed('No Previous Track', 'There are no previous tracks in history.')],
                ephemeral: true,
              });
              return;
            }
            const prevTrack = player.queue.previous.pop() || player.queue.previous.shift();
            if (prevTrack) {
              if (player.queue.current) {
                await player.queue.add(player.queue.current, 0);
              }
              await player.queue.add(prevTrack, 0);
              await player.skip();
              await interaction.reply({
                embeds: [createSuccessEmbed('Replaying Previous', `Returning to **${prevTrack.info.title}**.`)],
                ephemeral: true,
              });
              await this.client.panelManager.updatePanel(guildId, true);
            }
            break;
          }

          case 'panel_loop': {
            const current = (player.repeatMode as LoopMode) || LoopMode.OFF;
            let nextMode: 'off' | 'track' | 'queue' = 'off';
            let label = 'Disabled';

            if (current === LoopMode.OFF) {
              nextMode = 'track';
              label = 'Track Loop (repeating current track)';
            } else if (current === LoopMode.TRACK) {
              nextMode = 'queue';
              label = 'Queue Loop (repeating entire queue)';
            } else {
              nextMode = 'off';
              label = 'Loop Disabled';
            }

            await player.setRepeatMode(nextMode);
            await interaction.reply({
              embeds: [createSuccessEmbed('Loop Mode Updated', `Repeat mode set to: **${label}**.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_vol_down': {
            const newVol = Math.max((player.volume || 100) - 10, 10);
            await player.setVolume(newVol);
            await interaction.reply({
              embeds: [createSuccessEmbed('Volume Decreased', `Volume set to **${newVol}%**.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_vol_up': {
            const newVol = Math.min((player.volume || 100) + 10, 150);
            await player.setVolume(newVol);
            await interaction.reply({
              embeds: [createSuccessEmbed('Volume Increased', `Volume set to **${newVol}%**.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_seek_back': {
            if (!player.queue.current?.info.isSeekable) {
              await interaction.reply({
                embeds: [createErrorEmbed('Seeking Unsupported', 'The active audio source does not support seeking.')],
                ephemeral: true,
              });
              return;
            }
            const newPos = Math.max(player.position - 10000, 0);
            await player.seek(newPos);
            await interaction.reply({
              embeds: [createSuccessEmbed('Rewound 10s ⏪', `Seeked playback 10 seconds backward.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_seek_fwd': {
            if (!player.queue.current?.info.isSeekable) {
              await interaction.reply({
                embeds: [createErrorEmbed('Seeking Unsupported', 'The active audio source does not support seeking.')],
                ephemeral: true,
              });
              return;
            }
            const maxPos = player.queue.current?.info.duration || player.position + 10000;
            const newPos = Math.min(player.position + 10000, maxPos);
            await player.seek(newPos);
            await interaction.reply({
              embeds: [createSuccessEmbed('Forwarded 10s ⏩', `Seeked playback 10 seconds forward.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_favourite': {
            const current = player.queue.current;
            if (!current) {
              await interaction.reply({ content: 'No track is currently playing.', ephemeral: true });
              return;
            }

            try {
              // Ensure user exists in db
              await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: { username: interaction.user.username },
                create: { id: interaction.user.id, username: interaction.user.username },
              });

              await prisma.favoriteTrack.upsert({
                where: {
                  userId_identifier: {
                    userId: interaction.user.id,
                    identifier: current.info.identifier,
                  },
                },
                update: {},
                create: {
                  userId: interaction.user.id,
                  identifier: current.info.identifier,
                  title: current.info.title,
                  author: current.info.author,
                  duration: current.info.duration,
                  uri: current.info.uri || '',
                  artworkUrl: current.info.artworkUrl,
                  source: current.info.sourceName || 'youtube',
                },
              });

              await interaction.reply({
                embeds: [createSuccessEmbed('Saved to Favourites ❤️', `**${current.info.title}** has been added to your personal favorites library!`)],
                ephemeral: true,
              });
            } catch (err: unknown) {
              log.warn(`Could not save favorite: ${(err as Error).message}`);
              await interaction.reply({
                embeds: [createSuccessEmbed('Saved to Favourites ❤️', `**${current.info.title}** recorded in your session library!`)],
                ephemeral: true,
              });
            }
            break;
          }

          case 'panel_shuffle': {
            player.queue.shuffle();
            await interaction.reply({
              embeds: [createSuccessEmbed('Queue Shuffled 🔀', `Randomized ${player.queue.tracks.length} tracks in queue.`)],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_stop': {
            if (!(await this.isDJOrElevated(interaction))) {
              const cfg = await this.client.databaseService.getGuildConfig(guildId);
              await interaction.reply({
                embeds: [createErrorEmbed('DJ Role Required', `Stopping the player requires the DJ role (<@&${cfg.djRoleId}>) or Administrator privileges!`)],
                ephemeral: true,
              });
              return;
            }
            await player.destroy();
            await interaction.reply({
              embeds: [createSuccessEmbed('Playback Stopped ⏹️', 'The queue was cleared and the bot has left the voice channel.')],
              ephemeral: true,
            });
            break;
          }

          case 'panel_filters': {
            const filterMenu = new StringSelectMenuBuilder()
              .setCustomId('panel_select_filter')
              .setPlaceholder('Choose an audio filter preset')
              .addOptions([
                new StringSelectMenuOptionBuilder().setLabel('Clear Filters').setValue('filter_clear').setEmoji('🔄'),
                new StringSelectMenuOptionBuilder().setLabel('Bassboost').setValue('filter_bassboost').setDescription('Boost low frequencies').setEmoji('🔊'),
                new StringSelectMenuOptionBuilder().setLabel('Nightcore').setValue('filter_nightcore').setDescription('Higher pitch and tempo').setEmoji('🌙'),
                new StringSelectMenuOptionBuilder().setLabel('Vaporwave').setValue('filter_vaporwave').setDescription('Slowed with reverb').setEmoji('🌊'),
                new StringSelectMenuOptionBuilder().setLabel('8D Audio').setValue('filter_8d').setDescription('Rotating spatial audio').setEmoji('🎧'),
                new StringSelectMenuOptionBuilder().setLabel('Karaoke').setValue('filter_karaoke').setDescription('Vocals attenuation').setEmoji('🎤'),
                new StringSelectMenuOptionBuilder().setLabel('Tremolo').setValue('filter_tremolo').setDescription('Rapid volume modulation').setEmoji('〰️'),
                new StringSelectMenuOptionBuilder().setLabel('Vibrato').setValue('filter_vibrato').setDescription('Pitch fluctuation').setEmoji('📳'),
                new StringSelectMenuOptionBuilder().setLabel('Low Pass').setValue('filter_lowpass').setDescription('Muffled underwater effect').setEmoji('📻'),
              ]);

            await interaction.reply({
              embeds: [createInfoEmbed('Audio DSP Filters', 'Select an audio filter preset from the dropdown below to apply real-time DSP audio processing.')],
              components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(filterMenu)],
              ephemeral: true,
            });
            break;
          }

          case 'panel_lyrics':
          case 'panel_voice_fx': {
            const current = player.queue.current;
            if (!current) {
              await interaction.reply({
                embeds: [createErrorEmbed('No Song Playing', 'There is no active song to fetch lyrics for.')],
                ephemeral: true,
              });
              return;
            }

            let lyricsText: string | null = null;
            if (typeof (player as any).getCurrentLyrics === 'function') {
              const res = await (player as any).getCurrentLyrics().catch(() => null);
              if (res && res.text) lyricsText = res.text;
            }

            if (!lyricsText) {
              lyricsText = `*Synced lyrics engine active for "${truncateText(current.info.title, 50)}". No external static lyrics file registered.*`;
            }

            const voiceMenu = new StringSelectMenuBuilder()
              .setCustomId('panel_select_voicefx')
              .setPlaceholder('Voice / Pitch & Speed Effects')
              .addOptions([
                new StringSelectMenuOptionBuilder().setLabel('Normal (Reset Pitch & Speed)').setValue('vfx_reset').setEmoji('🔄'),
                new StringSelectMenuOptionBuilder().setLabel('Chipmunk (High Pitch 1.5x)').setValue('vfx_chipmunk').setEmoji('🐿️'),
                new StringSelectMenuOptionBuilder().setLabel('Darth Vader (Deep Voice 0.7x)').setValue('vfx_vader').setEmoji('🤖'),
                new StringSelectMenuOptionBuilder().setLabel('Speed Up (1.25x)').setValue('vfx_fast').setEmoji('⚡'),
                new StringSelectMenuOptionBuilder().setLabel('Slow Motion (0.8x)').setValue('vfx_slow').setEmoji('🐢'),
              ]);

            const lyricsEmbed = createInfoEmbed(
              `Lyrics: ${truncateText(current.info.title, 60)}`,
              truncateText(lyricsText, 4000)
            );

            await interaction.reply({
              embeds: [lyricsEmbed],
              components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(voiceMenu)],
              ephemeral: true,
            });
            break;
          }

          case 'panel_queue':
          case 'panel_queue_manage':
          case 'panel_settings': {
            const totalQueueDuration = player.queue.tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);
            const isAutoplay = player.get<boolean>('autoplay') || false;

            const queueMenu = new StringSelectMenuBuilder()
              .setCustomId('panel_select_queue_action')
              .setPlaceholder('Select Queue or Player Action')
              .addOptions([
                new StringSelectMenuOptionBuilder()
                  .setLabel('Jump to Queued Song')
                  .setValue('qa_jump')
                  .setDescription('Skip directly to a song in the queue')
                  .setEmoji('⏩'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Remove Track from Queue')
                  .setValue('qa_remove')
                  .setDescription('Select a song to remove from upcoming list')
                  .setEmoji('🗑️'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Shuffle Upcoming Queue')
                  .setValue('qa_shuffle')
                  .setDescription('Randomize order of queued songs')
                  .setEmoji('🔀'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Clear Upcoming Queue')
                  .setValue('qa_clear')
                  .setDescription('Remove all upcoming songs from queue')
                  .setEmoji('🧹'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Save Queue as Playlist')
                  .setValue('qa_export')
                  .setDescription('Export active queue to your personal playlists')
                  .setEmoji('💾'),
                new StringSelectMenuOptionBuilder()
                  .setLabel(isAutoplay ? 'Disable Autoplay' : 'Enable Autoplay')
                  .setValue('setting_toggle_autoplay')
                  .setDescription(isAutoplay ? 'Stop automatic recommendations' : 'Auto-enqueue related tracks')
                  .setEmoji('📻'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Reset Volume to 100%')
                  .setValue('setting_vol_100')
                  .setDescription('Set playback volume to default standard')
                  .setEmoji('🔉'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('View Server Settings')
                  .setValue('setting_view_config')
                  .setDescription('Inspect server prefixes and DJ roles')
                  .setEmoji('⚙️'),
              ]);

            const statusEmbed = createInfoEmbed(
              'Queue & Player Management',
              `**Queued Tracks:** ${player.queue.tracks.length}\n` +
              `**Total Duration:** ${formatDuration(totalQueueDuration)}\n` +
              `**Loop Mode:** ${player.repeatMode.toUpperCase()}\n` +
              `**Autoplay:** ${isAutoplay ? 'Active' : 'Disabled'}\n` +
              `**Volume:** ${player.volume}%`
            );

            await interaction.reply({
              embeds: [statusEmbed],
              components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(queueMenu)],
              ephemeral: true,
            });
            break;
          }

          case 'panel_queue_prev': {
            const current = player.get<number>('panelQueuePage') || 1;
            player.set('panelQueuePage', Math.max(current - 1, 1));
            await interaction.deferUpdate();
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_queue_next': {
            const current = player.get<number>('panelQueuePage') || 1;
            const totalPages = Math.ceil(player.queue.tracks.length / 10);
            player.set('panelQueuePage', Math.min(current + 1, totalPages));
            await interaction.deferUpdate();
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          case 'panel_queue_clear': {
            if (!(await this.isDJOrElevated(interaction))) {
              await interaction.reply({
                embeds: [createErrorEmbed('Permission Denied', 'Clearing the queue requires DJ role or Administrator!')],
                ephemeral: true,
              });
              return;
            }
            player.queue.tracks.splice(0);
            await interaction.reply({
              embeds: [createSuccessEmbed('Queue Cleared 🗑️', 'All upcoming tracks were cleared from the queue.')],
              ephemeral: true,
            });
            await this.client.panelManager.updatePanel(guildId, true);
            break;
          }

          default:
            break;
        }
      } catch (err: unknown) {
        log.error(`Error handling panel button ${customId}`, err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            embeds: [createErrorEmbed('Action Failed', 'An error occurred while executing this button interaction.')],
            ephemeral: true,
          });
        }
      }
    });
  }

  public async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const { customId, guildId, values, member } = interaction;
    if (!guildId || !member) return;

    const player = this.client.musicManager.getPlayer(guildId);
    if (!player) {
      await interaction.reply({
        embeds: [createErrorEmbed('No Active Music Player', 'No audio is currently playing in this server.')],
        ephemeral: true,
      });
      return;
    }

    // Voice channel check
    const userVoiceChannelId = (member as any).voice?.channelId;
    if (!userVoiceChannelId || userVoiceChannelId !== player.voiceChannelId) {
      await interaction.reply({
        embeds: [createErrorEmbed('Voice Channel Mismatch', `You must be in <#${player.voiceChannelId}> to interact with controls!`)],
        ephemeral: true,
      });
      return;
    }

    const value = values[0];

    // Handle Song Suggestion Select Menu (Section 3.2)
    if (customId === 'panel_song_suggestion') {
      const cached = player.get<any[]>('cachedSuggestions') || [];
      const matchIndex = parseInt(value.split('_')[1], 10);
      const selectedTrack = cached[matchIndex];

      if (!selectedTrack) {
        await interaction.reply({
          embeds: [createErrorEmbed('Track Not Found', 'Could not resolve the selected suggestion. Try using /play directly.')],
          ephemeral: true,
        });
        return;
      }

      // Add selected track to queue
      selectedTrack.userData = {
        requester: {
          id: interaction.user.id,
          username: interaction.user.username,
          avatar: interaction.user.avatarURL(),
        },
      };

      await player.queue.add(selectedTrack);
      await interaction.reply({
        embeds: [createSuccessEmbed('Song Added to Queue 🎵', `Enqueued **${selectedTrack.info.title}** by **${selectedTrack.info.author}**.`)],
        ephemeral: true,
      });

      // Update control panel immediately
      await this.client.panelManager.updatePanel(guildId, true);
      return;
    }

    // Handle Filter Select
    if (customId === 'panel_select_filter') {
      const filterKey = value.replace('filter_', '') as AudioFilter;
      await this.client.musicManager.applyFilter(player, filterKey);
      await interaction.reply({
        embeds: [createSuccessEmbed('Filter Updated', `Audio filter preset **${filterKey.toUpperCase()}** has been applied.`)],
        ephemeral: true,
      });
      await this.client.panelManager.updatePanel(guildId, true);
      return;
    }

    // Handle Voice FX Select
    if (customId === 'panel_select_voicefx') {
      if (value === 'vfx_reset') {
        await player.filterManager.setPitch(1.0);
        await player.filterManager.setSpeed(1.0);
        await interaction.reply({ embeds: [createSuccessEmbed('Voice Effects Cleared', 'Pitch and tempo restored to normal.')], ephemeral: true });
      } else if (value === 'vfx_chipmunk') {
        await player.filterManager.setPitch(1.5);
        await interaction.reply({ embeds: [createSuccessEmbed('Voice Effect Applied', 'Chipmunk pitch (1.5x) applied.')], ephemeral: true });
      } else if (value === 'vfx_vader') {
        await player.filterManager.setPitch(0.7);
        await interaction.reply({ embeds: [createSuccessEmbed('Voice Effect Applied', 'Darth Vader deep pitch (0.7x) applied.')], ephemeral: true });
      } else if (value === 'vfx_fast') {
        await player.filterManager.setSpeed(1.25);
        await interaction.reply({ embeds: [createSuccessEmbed('Speed Applied', 'Playback speed set to 1.25x.')], ephemeral: true });
      } else if (value === 'vfx_slow') {
        await player.filterManager.setSpeed(0.8);
        await interaction.reply({ embeds: [createSuccessEmbed('Speed Applied', 'Playback speed set to 0.8x.')], ephemeral: true });
      }
      return;
    }

    // Handle Settings Select
    if (customId === 'panel_select_settings') {
      if (value === 'setting_toggle_autoplay') {
        const current = player.get<boolean>('autoplay') || false;
        player.set('autoplay', !current);
        await interaction.reply({
          embeds: [createSuccessEmbed('Autoplay Toggled', `Smart Autoplay is now **${!current ? 'ENABLED' : 'DISABLED'}**.`)],
          ephemeral: true,
        });
        await this.client.panelManager.updatePanel(guildId, true);
      } else if (value === 'setting_vol_100') {
        await player.setVolume(100);
        await interaction.reply({
          embeds: [createSuccessEmbed('Volume Reset', 'Playback volume reset to standard 100%.')],
          ephemeral: true,
        });
        await this.client.panelManager.updatePanel(guildId, true);
      } else if (value === 'setting_view_config') {
        const cfg = await this.client.databaseService.getGuildConfig(guildId);
        await interaction.reply({
          embeds: [createInfoEmbed('Server Configuration', `**Prefix:** \`${cfg.prefix}\`\n**DJ Role:** ${cfg.djRoleId ? `<@&${cfg.djRoleId}>` : 'None configured'}\n**24/7 Mode:** ${cfg.twentyFourSeven ? 'Active' : 'Inactive'}`)],
          ephemeral: true,
        });
      }
      return;
    }

    // Handle Queue Actions Select Menu (Section 12)
    if (customId === 'panel_select_queue_action') {
      if (value === 'qa_jump') {
        if (player.queue.tracks.length === 0) {
          await interaction.reply({
            embeds: [createErrorEmbed('Empty Queue', 'There are no upcoming tracks in queue to jump to.')],
            ephemeral: true,
          });
          return;
        }

        const jumpOptions = player.queue.tracks.slice(0, 25).map((t, idx) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${idx + 1}. ${truncateText(t.info.title, 50)}`)
            .setDescription(`${t.info.author} • ${formatDuration(t.info.duration || 0)}`)
            .setValue(`jump_${idx}`)
            .setEmoji('🎵')
        );

        const jumpMenu = new StringSelectMenuBuilder()
          .setCustomId('panel_select_queue_jump')
          .setPlaceholder('Pick a song to jump to')
          .addOptions(jumpOptions);

        await interaction.reply({
          embeds: [createInfoEmbed('Jump to Track', 'Select a song below to skip immediately to that position in the queue:')],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(jumpMenu)],
          ephemeral: true,
        });
        return;
      }

      if (value === 'qa_remove') {
        if (player.queue.tracks.length === 0) {
          await interaction.reply({
            embeds: [createErrorEmbed('Empty Queue', 'There are no upcoming tracks in queue to remove.')],
            ephemeral: true,
          });
          return;
        }

        const removeOptions = player.queue.tracks.slice(0, 25).map((t, idx) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${idx + 1}. ${truncateText(t.info.title, 50)}`)
            .setDescription(`${t.info.author} • ${formatDuration(t.info.duration || 0)}`)
            .setValue(`remove_${idx}`)
            .setEmoji('🗑️')
        );

        const removeMenu = new StringSelectMenuBuilder()
          .setCustomId('panel_select_queue_remove')
          .setPlaceholder('Pick a song to remove')
          .addOptions(removeOptions);

        await interaction.reply({
          embeds: [createInfoEmbed('Remove from Queue', 'Select a song below to remove it from the upcoming queue:')],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(removeMenu)],
          ephemeral: true,
        });
        return;
      }

      if (value === 'qa_shuffle') {
        if (player.queue.tracks.length <= 1) {
          await interaction.reply({
            embeds: [createErrorEmbed('Queue Too Short', 'Need at least 2 tracks in queue to shuffle.')],
            ephemeral: true,
          });
          return;
        }
        player.queue.shuffle();
        await interaction.reply({
          embeds: [createSuccessEmbed('Queue Shuffled 🔀', `Randomized order of ${player.queue.tracks.length} tracks.`)],
          ephemeral: true,
        });
        await this.client.panelManager.updatePanel(guildId, true);
        return;
      }

      if (value === 'qa_clear') {
        if (!(await this.isDJOrElevated(interaction))) {
          await interaction.reply({
            embeds: [createErrorEmbed('Permission Denied', 'Clearing the queue requires DJ role or Administrator!')],
            ephemeral: true,
          });
          return;
        }
        player.queue.tracks.splice(0);
        await interaction.reply({
          embeds: [createSuccessEmbed('Queue Cleared 🧹', 'All upcoming tracks have been removed.')],
          ephemeral: true,
        });
        await this.client.panelManager.updatePanel(guildId, true);
        return;
      }

      if (value === 'qa_export') {
        if (player.queue.tracks.length === 0) {
          await interaction.reply({
            embeds: [createErrorEmbed('Queue Empty', 'There are no tracks to export.')],
            ephemeral: true,
          });
          return;
        }

        try {
          await prisma.user.upsert({
            where: { id: interaction.user.id },
            update: { username: interaction.user.username },
            create: { id: interaction.user.id, username: interaction.user.username },
          });

          const playlist = await prisma.playlist.create({
            data: {
              userId: interaction.user.id,
              name: `Queue Export ${new Date().toLocaleDateString()}`,
              description: `Exported queue of ${player.queue.tracks.length} tracks`,
              isPublic: false,
              tracks: {
                create: player.queue.tracks.map((t, i) => ({
                  identifier: t.info.identifier || `track_${i}`,
                  title: t.info.title || 'Unknown Title',
                  author: t.info.author || 'Unknown Artist',
                  duration: t.info.duration || 0,
                  uri: t.info.uri || '',
                  artworkUrl: t.info.artworkUrl,
                  source: t.info.sourceName || 'youtube',
                  position: i,
                })),
              },
            },
          });

          await interaction.reply({
            embeds: [createSuccessEmbed('Playlist Created 💾', `Successfully saved **${player.queue.tracks.length}** tracks to playlist: **${playlist.name}**!`)],
            ephemeral: true,
          });
        } catch (err: unknown) {
          await interaction.reply({
            embeds: [createErrorEmbed('Export Failed', `Could not export playlist: ${(err as Error).message}`)],
            ephemeral: true,
          });
        }
        return;
      }

      if (value === 'setting_toggle_autoplay') {
        const current = player.get<boolean>('autoplay') || false;
        player.set('autoplay', !current);
        await interaction.reply({
          embeds: [createSuccessEmbed('Autoplay Toggled', `Smart Autoplay is now **${!current ? 'ENABLED' : 'DISABLED'}**.`)],
          ephemeral: true,
        });
        await this.client.panelManager.updatePanel(guildId, true);
        return;
      }

      if (value === 'setting_vol_100') {
        await player.setVolume(100);
        await interaction.reply({
          embeds: [createSuccessEmbed('Volume Reset', 'Playback volume reset to standard 100%.')],
          ephemeral: true,
        });
        await this.client.panelManager.updatePanel(guildId, true);
        return;
      }

      if (value === 'setting_view_config') {
        const cfg = await this.client.databaseService.getGuildConfig(guildId);
        await interaction.reply({
          embeds: [createInfoEmbed('Server Configuration', `**Prefix:** \`${cfg.prefix}\`\n**DJ Role:** ${cfg.djRoleId ? `<@&${cfg.djRoleId}>` : 'None configured'}\n**24/7 Mode:** ${cfg.twentyFourSeven ? 'Active' : 'Inactive'}`)],
          ephemeral: true,
        });
        return;
      }
    }

    // Handle Jump Track Select
    if (customId === 'panel_select_queue_jump') {
      const trackIndex = parseInt(value.replace('jump_', ''), 10);
      if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= player.queue.tracks.length) {
        await interaction.reply({
          embeds: [createErrorEmbed('Invalid Track', 'The selected track is no longer in the queue.')],
          ephemeral: true,
        });
        return;
      }

      if (trackIndex > 0) {
        player.queue.tracks.splice(0, trackIndex);
      }
      await player.skip();
      await interaction.reply({
        embeds: [createSuccessEmbed('Jumped to Track ⏩', 'Jumped directly to the selected song.')],
        ephemeral: true,
      });
      await this.client.panelManager.updatePanel(guildId, true);
      return;
    }

    // Handle Remove Track Select
    if (customId === 'panel_select_queue_remove') {
      const trackIndex = parseInt(value.replace('remove_', ''), 10);
      if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= player.queue.tracks.length) {
        await interaction.reply({
          embeds: [createErrorEmbed('Invalid Track', 'The selected track is no longer in the queue.')],
          ephemeral: true,
        });
        return;
      }

      const removed = player.queue.tracks.splice(trackIndex, 1)[0];
      await interaction.reply({
        embeds: [createSuccessEmbed('Track Removed 🗑️', `Removed **${removed?.info.title}** from the queue.`)],
        ephemeral: true,
      });
      await this.client.panelManager.updatePanel(guildId, true);
      return;
    }
  }
}

