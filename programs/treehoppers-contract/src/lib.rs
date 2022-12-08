use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token::{MintTo, Token};
use mpl_token_metadata::instruction::{create_master_edition_v3, create_metadata_accounts_v3};

declare_id!("BgAh9RE8D5119VA1q28MxPMx77mdbYxWc7DPB5ULAB5x");

#[program]
pub mod treehoppers_contract {
    use anchor_spl::token::mint_to;

    use super::*;

    pub fn mint_nft(
        ctx: Context<MintNFT>,
        creator_key: Pubkey,
        uri: String,
        title: String,
        symbol: String,
    ) -> Result<()> {
        msg!("Initialzing Mint Account");

        // Create a struct containing the accounts involved in the mint operation
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint_account.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        // Program in which CPI will be invoked
        let cpi_program = ctx.accounts.token_program.to_account_info();

        // Create CpiContext, which conatains all non-argument inputs for the cpi
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Call anchor's helper function to execute CPI, passing in the CPI context and amount
        mint_to(cpi_ctx, 1)?;
    
        msg!("Initializing Token Metadata Account");

        // Accounts required for creating token metadata account
        let create_metadata_accounts = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint_account.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];

        let creators = vec![
            mpl_token_metadata::state::Creator {
                address: creator_key,
                verified: false,
                share: 100,
            },
            mpl_token_metadata::state::Creator {
                address: ctx.accounts.mint_authority.key(),
                verified: false,
                share: 0,
            },
        ];
        let create_metadata_instruction = &create_metadata_accounts_v3(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.metadata.key(),
            ctx.accounts.mint_account.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.payer.key(),
            title,
            symbol,
            uri,
            Some(creators),
            1, // seller_fee_basis_points
            true, // update_authority_is_signer
            false, // isMutable
            None, // collection (optional)
            None, // uses (optional)
            None, // Collection Details (optional)
        );
        invoke(create_metadata_instruction, create_metadata_accounts.as_slice())?;

        msg!("Initializing Master Edition Account");
        let master_edition_account_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint_account.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        let master_edition_instruction = &create_master_edition_v3(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.master_edition.key(),
            ctx.accounts.mint_account.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.metadata.key(),
            ctx.accounts.payer.key(),
            Some(0),
        );
        invoke(master_edition_instruction, master_edition_account_infos.as_slice())?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    pub mint_account: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_metadata_program: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub payer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,
}
